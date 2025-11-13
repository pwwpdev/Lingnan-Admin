import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const WaterLeakHistorical = forwardRef(({ dateRange, reportType }, ref) => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState("all");

  useImperativeHandle(ref, () => ({
    tableData,
    convertToHKT,
    exportToCSV: () => {
      const csvContent = generateCSV();
      downloadCSV(csvContent, `water-leak-report-${dateRange.fromDate}-to-${dateRange.toDate}.csv`);
    }
  }));

  const rowsPerPage = 15;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  // Generate CSV function
  const generateCSV = () => {
    const headers = ['Sensor ID', 'Leak Status', 'Leak Time', 'Resume Time', 'Duration', 'Acknowledgment Status', 'Acknowledged By', 'Acknowledgment Time'];
    const csvRows = [headers.join(',')];
    
    filteredData.forEach(item => {
      const row = [
        item.sensor,
        item.leakage_status === 'leak' || item.leakage_status === 'leak detected' ? 'Leak Detected' : 'No Leak',
        convertToHKT(item.leak_time),
        item.resume_time ? convertToHKT(item.resume_time) : 'N/A',
        item.duration || 'N/A',
        item.ack_time ? 'Acknowledged' : 'Pending',
        item.userName || '',
        item.ack_time ? convertToHKT(item.ack_time) : ''
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });
    
    return csvRows.join('\n');
  };
  
  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredData =
    deviceFilter === "all"
      ? tableData
      : tableData.filter((item) => item.sensor.includes(deviceFilter));

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  // Format duration helper function
  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds < 0) return "N/A";
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // SIMPLIFIED: Fetch Water Leak data from unified API
  const fetchWaterLeakData = async () => {
    setIsLoading(true);
    try {
      // Use the new unified API that contains everything
      const response = await fetch('https://njs-01.optimuslab.space/lnu-footfall/floor-zone/ack-leaks');
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();

      if (Array.isArray(data)) {
        // Filter data based on the selected date range
        const startDate = new Date(dateRange.fromDate);
        const endDate = new Date(dateRange.toDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
        
        const filteredByDate = data.filter(item => {
          const leakDate = new Date(item.leak_time);
          return leakDate >= startDate && leakDate <= endDate;
        });

        // Enhance data with resume time and duration
        const enhancedData = filteredByDate.map(item => {
          const resumeTime = item.back_to_normal_timestamp; // Resume time is directly available
          
          let duration = null;
          if (resumeTime && item.leak_time) {
            const leakStart = new Date(item.leak_time);
            const leakEnd = new Date(resumeTime);
            const durationMs = leakEnd - leakStart;
            duration = formatDuration(durationMs);
          }
          
          return {
            ...item,
            resume_time: resumeTime,
            duration: duration
          };
        });

        // Sort data by leak time (most recent first)
        const sortedData = [...enhancedData].sort((a, b) => 
          new Date(b.leak_time) - new Date(a.leak_time)
        );
        
        setTableData(sortedData);
      }
    } catch (error) {
      console.error("Error fetching Water Leak data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchWaterLeakData();
  }, [dateRange, reportType]);

  // Convert UTC to HKT (UTC+8)
  const convertToHKT = (utcDateString) => {
    if (!utcDateString) return "N/A";
    
    // Create a new date object from the UTC string
    const utcDate = new Date(utcDateString);
    
    // Get UTC time values
    const utcYear = utcDate.getUTCFullYear();
    const utcMonth = utcDate.getUTCMonth();
    const utcDay = utcDate.getUTCDate();
    const utcHours = utcDate.getUTCHours();
    const utcMinutes = utcDate.getUTCMinutes();
    const utcSeconds = utcDate.getUTCSeconds();
    
    // Create new date with UTC values and add 8 hours for HKT
    const hktDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours + 8, utcMinutes, utcSeconds));
    
    // Format the date string
    return `${hktDate.getUTCFullYear()}-${String(hktDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hktDate.getUTCDate()).padStart(2, '0')} ${String(hktDate.getUTCHours()).padStart(2, '0')}:${String(hktDate.getUTCMinutes()).padStart(2, '0')}:${String(hktDate.getUTCSeconds()).padStart(2, '0')}`;
  };

  // Get leak status badge color - FIXED to handle string values
  const getLeakStatusColor = (status) => {
    const isLeak = status === 'leak' || status === 'leak detected';
    return isLeak ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  // Get acknowledgment status
  const getAckStatus = (item) => {
    if (item.ack_time) {
      return (
        <div>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
            Acknowledged
          </span>
          <div className="text-xs mt-1">by {item.userName || 'Unknown'}</div>
          <div className="text-xs mt-1">{convertToHKT(item.ack_time)}</div>
        </div>
      );
    } else {
      return (
        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
          Pending
        </span>
      );
    }
  };

  return (
    <div>
      <div className="mb-10 rounded-xl border custom-shadow border-gray-300 overflow-hidden bg-white w-[98%] mt-10 mx-auto">
        {isLoading ? (
          <div className="text-center py-10">Loading Water Leak data...</div>
        ) : tableData.length > 0 ? (
          <>
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-center px-4 py-4">Sensor ID</th>
                  <th className="text-center px-4 py-4">Leak Status</th>
                  <th className="text-center px-4 py-4">Leak Time</th>
                  <th className="text-center px-4 py-4">Resume Time</th>
                  <th className="text-center px-4 py-4">Duration</th>
                  <th className="text-center px-4 py-4">Acknowledgment</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((item, index) => (
                  <tr 
                    key={item.id}
                    className={`hover:bg-gray-50 ${
                      index === currentRows.length - 1 
                        ? ""
                        : "border-b border-gray-300"
                    }`}
                  >
                    <td className="text-center px-4 py-3">{item.sensor}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getLeakStatusColor(item.leakage_status)}`}>
                        {(item.leakage_status === 'leak' || item.leakage_status === 'leak detected') ? 'Leak Detected' : 'No Leak'}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">{convertToHKT(item.leak_time)}</td>
                    <td className="text-center px-4 py-3">
                      {item.resume_time ? convertToHKT(item.resume_time) : "N/A"}
                    </td>
                    <td className="text-center px-4 py-3">
                      {item.duration || "N/A"}
                    </td>
                    <td className="text-center px-4 py-3">
                      {getAckStatus(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-8 py-3 border-t border-gray-300 bg-white">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {indexOfFirstRow + 1}-
                {Math.min(indexOfLastRow, filteredData.length)} of{" "}
                {filteredData.length} rows
              </div>
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                      currentPage === idx + 1
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            No water leaks detected on selected date
          </div>
        )}
      </div>
    </div>
  );
});

export default WaterLeakHistorical;