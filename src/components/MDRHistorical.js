  import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

  const MDRHistorical = forwardRef(({ dateRange, reportType }, ref) => {
    const [tableData, setTableData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [deviceFilter, setDeviceFilter] = useState("all");

    useImperativeHandle(ref, () => ({
      tableData,
      exportToCSV: () => {
        const csvContent = generateCSV();
        downloadCSV(csvContent, `mdr-report-${dateRange.fromDate}-to-${dateRange.toDate}.csv`);
      }
    }));

    const generateCSV = () => {
      const headers = ['Device Name', 'Magnet Status', 'Battery (%)', 'Open Time', 'Close Time', 'Duration', 'Acknowledgment Status', 'Acknowledged By', 'Acknowledgment Time'];
      const csvRows = [headers.join(',')];
      
      filteredData.forEach(item => {
        const row = [
          item.deviceName,
          item.magnet_status,
          `${item.battery}%`,
          convertToHKT(item.timestamp),
          item.door_closetime ? convertToHKT(item.door_closetime) : 'N/A',
          item.duration || 'N/A',
          item.ack === 1 ? 'Acknowledged' : 'Pending',
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

  // Convert UTC to HKT (UTC+8)
  const convertToHKT = (utcDateString) => {
    if (!utcDateString) return "N/A";
    
    const utcDate = new Date(utcDateString);
    const utcYear = utcDate.getUTCFullYear();
    const utcMonth = utcDate.getUTCMonth();
    const utcDay = utcDate.getUTCDate();
    const utcHours = utcDate.getUTCHours();
    const utcMinutes = utcDate.getUTCMinutes();
    const utcSeconds = utcDate.getUTCSeconds();
    
    const hktDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours + 8, utcMinutes, utcSeconds));
    
    return `${hktDate.getUTCFullYear()}-${String(hktDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hktDate.getUTCDate()).padStart(2, '0')} ${String(hktDate.getUTCHours()).padStart(2, '0')}:${String(hktDate.getUTCMinutes()).padStart(2, '0')}:${String(hktDate.getUTCSeconds()).padStart(2, '0')}`;
  };

  // Get acknowledgment status
  const getAckStatus = (item) => {
    if (item.ack === 1 && item.ack_time) {
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

    const rowsPerPage = 15;
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;

    // Filter out WS301-915M-01 device and apply device filter
    const filteredData = tableData
      .filter((item) => item.deviceName !== "WS301-915M-01") // Exclude WS301-915M-01
      .filter((item) => 
        deviceFilter === "all" ? true : item.deviceName.includes(deviceFilter)
      );

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

    // Fetch MDR data
    const fetchMDRData = async () => {
      setIsLoading(true);
      try {
        // Fetch both acknowledged and unacknowledged events
        const [ackResponse, unackResponse] = await Promise.all([
          fetch('https://lnumdrsensorack-dot-optimus-lnu.df.r.appspot.com/ack-mdr'),
          fetch('https://lnumdrsensorack-dot-optimus-lnu.df.r.appspot.com/mdr')
        ]);
    
        const ackData = await ackResponse.json();
        const unackData = await unackResponse.json();
    
        // Combine both datasets
        const allData = [...ackData, ...unackData];
    
        // Filter by date range
        const startDate = new Date(dateRange.fromDate);
        const endDate = new Date(dateRange.toDate);
        endDate.setHours(23, 59, 59, 999);
        
        const filteredData = allData
          .filter(item => {
            const openDate = new Date(item.timestamp);
            return openDate >= startDate && openDate <= endDate;
          })
          .map(item => ({
            ...item,
            deviceName: item.device,
            time: item.timestamp,
            duration: item.door_closetime 
              ? formatDuration(new Date(item.door_closetime) - new Date(item.timestamp)) 
              : null
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setTableData(filteredData);
      } catch (error) {
        console.error("Error fetching MDR data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial data fetch
    useEffect(() => {
      fetchMDRData();
    }, [dateRange, reportType]);

    // Format date and time for display (DD-MM-YYYY HH:MM)
    const formatDateTimeDisplay = (dateString) => {
      const date = new Date(dateString);
      return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // Get status badge color
    const getStatusColor = (status) => {
      switch (status) {
        case 'open':
          return 'bg-red-100 text-green-800';
        case 'close':
          return 'bg-green-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };
    
    // Get tamper status badge color
    const getTamperStatusColor = (status) => {
      switch (status) {
        case 'installed':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-yellow-100 text-yellow-800';
      }
    };
    
    // Get battery level color
    const getBatteryLevelColor = (level) => {
      if (level >= 75) return 'text-green-600';
      if (level >= 50) return 'text-yellow-600';
      if (level >= 25) return 'text-orange-600';
      return 'text-red-600';
    };

    return (
      <div>
        <div className="mb-10 rounded-xl border custom-shadow  border-gray-300 overflow-hidden bg-white w-[98%] mt-10 mx-auto">
          {isLoading ? (
            <div className="text-center py-10">Loading MDR data...</div>
          ) : tableData.length > 0 ? (
            <table className="table-auto w-full">
              <thead>
    <tr className="bg-gray-100">
      <th className="text-center px-4 py-4">Device Name</th>
      <th className="text-center px-4 py-4">Magnet Status</th>
      <th className="text-center px-4 py-4">Battery (%)</th>
      <th className="text-center px-4 py-4">Open Time</th>
      <th className="text-center px-4 py-4">Close Time</th>
      <th className="text-center px-4 py-4">Duration</th>
      <th className="text-center px-4 py-4">Acknowledgment</th>
    </tr>
  </thead>
  <tbody>
    {currentRows.map((item, index) => (
      <tr 
        key={`${item.deviceName}-${item.timestamp}`}
        className={`hover:bg-gray-50 ${
          index === currentRows.length - 1 
            ? ""
            : "border-b border-gray-300"
        }`}
      >
        <td className="text-center px-4 py-3">{item.deviceName}</td>
        <td className="text-center px-4 py-3">
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.magnet_status)}`}>
            {item.magnet_status}
          </span>
        </td>
        <td className="text-center px-4 py-3">
          <span className={getBatteryLevelColor(item.battery)}>
            {item.battery}%
          </span>
        </td>
        <td className="text-center px-4 py-3">{convertToHKT(item.timestamp)}</td>
        <td className="text-center px-4 py-3">
          {item.door_closetime ? convertToHKT(item.door_closetime) : "N/A"}
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
          ) : (
            <div className="text-center py-10">
              No doors opened for the selected date
            </div>
          )}

          {tableData.length > 0 && (
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
          )}
        </div>
        
        
      </div>
    );
  });

  export default MDRHistorical;