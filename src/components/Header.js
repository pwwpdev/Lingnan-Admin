import React, { useState, useEffect } from "react";
import { FaTemperatureHigh, FaTint, FaWind } from "react-icons/fa";

const Header = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  showWeatherData = false, 
  showLiveCount = false,
  customContent = null,
  className = ""
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [liveCount, setLiveCount] = useState(0);

  // Time formatting
  const day = currentDate.getDate().toString().padStart(2, "0");
  const month = currentDate.toLocaleString("en-US", { month: "short" });
  const shortWeekday = currentDate.toLocaleString("en-US", { weekday: "short" });
  const time = currentDate.toLocaleString("en-US", { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
  
  const formattedDate = `${day} ${month}, ${shortWeekday}`;
  const formattedTime = time;

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      setCurrentDate(new Date());
    };
  
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch live count (only if showLiveCount is true)
  useEffect(() => {
    if (!showLiveCount) return;

    const fetchLiveCount = async () => {
      try {
        const response = await fetch(
          "https://optimusc.flowfuse.cloud/all-zones"
        );
        const data = await response.json();
        
        // Get main-entrance adjusted occupancy
        const mainEntranceData = data["main-entrance"];
        const liveCountValue = mainEntranceData ? mainEntranceData.totals.adjustedOccupancy : 0;
        
        setLiveCount(liveCountValue);
      } catch (error) {
        console.error("Error fetching live count:", error);
      }
    };

    fetchLiveCount();
    const intervalId = setInterval(fetchLiveCount, 60000);
    return () => clearInterval(intervalId);
  }, [showLiveCount]);

  // Fetch weather data (only if showWeatherData is true)
  useEffect(() => {
    if (!showWeatherData) return;

    const fetchTemperature = async () => {
      try {
        const response = await fetch("https://njs-01.optimuslab.space/lnu-footfall/floor-zone/weather");
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const responseText = await response.text();
        
        const htmlPattern = /Tuen Mun<\/font><\/td><td[^>]*><font[^>]*>(\d{1,2}) degrees/;
        let match = responseText.match(htmlPattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return;
        }
        
        const simplePattern = /Tuen Mun(?:(?!Tuen Mun).){1,100}?(\d{1,2}) degrees/s;
        match = responseText.match(simplePattern);
        
        if (match && match[1]) {
          const temperature = parseInt(match[1], 10);
          setWeather(prevWeather => ({
            temp: temperature,
            humidity: prevWeather ? prevWeather.humidity : 70
          }));
          return;
        }
        
        setWeather(prevWeather => prevWeather || { temp: 30, humidity: 70 });
        
      } catch (error) {
        console.error("Error fetching temperature data:", error);
        setWeather(prevWeather => prevWeather || { temp: 30, humidity: 70 });
      }
    };
    
    fetchTemperature();
    const intervalId = setInterval(fetchTemperature, 30000);
    return () => clearInterval(intervalId);
  }, [showWeatherData]);

  // Fetch humidity data (only if showWeatherData is true)
  useEffect(() => {
    if (!showWeatherData) return;

    const fetchHumidity = async () => {
      try {
        const response = await fetch(
          "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en"
        );
        const data = await response.json();

        const humidity = data.humidity.data[0]?.value;

        if (humidity !== undefined) {
          setWeather((prevWeather) => ({
            temp: prevWeather ? prevWeather.temp : 32,
            humidity: humidity,
          }));
        }
      } catch (error) {
        console.error("Error fetching humidity data:", error);
      }
    };

    fetchHumidity();
    const intervalId = setInterval(fetchHumidity, 30000);
    return () => clearInterval(intervalId);
  }, [showWeatherData]);

  // Fetch air quality data (only if showWeatherData is true)
  useEffect(() => {
    if (!showWeatherData) return;

    const fallbackData = {
      pm10: 20.7,
      pm25: 15.9,
      timestamp: new Date(),
    };

    const fetchAirQuality = async () => {
      try {
        const response = await fetch(
          "https://njs-01.optimuslab.space/lnu-footfall/floor-zone/aqhi"
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseText = await response.text();
        
        if (responseText.trim().startsWith("<?xml") || responseText.trim().startsWith("<")) {
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(responseText, "text/xml");
            const pollutantConcentrations = xmlDoc.getElementsByTagName("PollutantConcentration");

            const tuenMunEntries = [];
            for (let i = 0; i < pollutantConcentrations.length; i++) {
              const stationElement = pollutantConcentrations[i].getElementsByTagName("StationName")[0];

              if (stationElement && stationElement.textContent === "Tuen Mun") {
                const dateTimeElement = pollutantConcentrations[i].getElementsByTagName("DateTime")[0];
                const pm10Element = pollutantConcentrations[i].getElementsByTagName("PM10")[0];
                const pm25Element = pollutantConcentrations[i].getElementsByTagName("PM2.5")[0];

                if (dateTimeElement && pm10Element && pm25Element) {
                  tuenMunEntries.push({
                    element: pollutantConcentrations[i],
                    dateTime: new Date(dateTimeElement.textContent),
                    pm10: parseFloat(pm10Element.textContent),
                    pm25: parseFloat(pm25Element.textContent),
                  });
                }
              }
            }

            if (tuenMunEntries.length > 0) {
              tuenMunEntries.sort((a, b) => b.dateTime - a.dateTime);
              const latestEntry = tuenMunEntries[0];

              setAirQuality({
                pm10: latestEntry.pm10,
                pm25: latestEntry.pm25,
                timestamp: latestEntry.dateTime,
              });
              return;
            }
          } catch (xmlError) {
            console.error("Error parsing XML:", xmlError);
          }
        }

        setAirQuality(fallbackData);
      } catch (error) {
        console.error("Error fetching air quality data:", error);
        setAirQuality(fallbackData);
      }
    };

    fetchAirQuality();
    const intervalId = setInterval(fetchAirQuality, 30000);
    return () => clearInterval(intervalId);
  }, [showWeatherData]);

  // Helper functions for air quality levels
  const getPM25Level = (value) => {
    if (value <= 12) return { level: "Good", color: "text-green-500" };
    if (value <= 35.4) return { level: "Moderate", color: "text-yellow-500" };
    if (value <= 55.4) return { level: "Unhealthy for Sensitive", color: "text-orange-600" };
    if (value <= 150.4) return { level: "Unhealthy", color: "text-red-500" };
    if (value <= 250.4) return { level: "Very Unhealthy", color: "text-purple-600" };
    return { level: "Hazardous", color: "text-red-800" };
  };

  const getPM10Level = (value) => {
    if (value <= 54) return { level: "Good", color: "text-green-500" };
    if (value <= 154) return { level: "Moderate", color: "text-yellow-500" };
    if (value <= 254) return { level: "Unhealthy for Sensitive", color: "text-orange-600" };
    if (value <= 354) return { level: "Unhealthy", color: "text-red-500" };
    if (value <= 424) return { level: "Very Unhealthy", color: "text-purple-600" };
    return { level: "Hazardous", color: "text-red-800" };
  };

  return (
    <header className="bg-[#ffffff] custom-shadow h-12 sm:h-14 lg:h-20 xl:h-[100px] fixed top-0 left-0 w-full z-10 flex items-center justify-between px-2 sm:px-4">
      {/* Left side - Hamburger and Logo */}
      <div className="flex items-center h-full">
        <button
          className={`flex flex-col justify-center items-start space-y-0.5 sm:space-y-1 pl-2 sm:pl-4 ${
            isSidebarOpen ? "hidden" : ""
          }`}
          onClick={() => setIsSidebarOpen(true)}
        >
          <span className="block w-3 h-0.5 sm:w-4 sm:h-0.5 md:w-6 md:h-0.5 lg:w-8 lg:h-1 bg-gray-700"></span>
          <span className="block w-3 h-0.5 sm:w-4 sm:h-0.5 md:w-6 md:h-0.5 lg:w-8 lg:h-1 bg-gray-700"></span>
          <span className="block w-3 h-0.5 sm:w-4 sm:h-0.5 md:w-6 md:h-0.5 lg:w-8 lg:h-1 bg-gray-700"></span>
        </button>
        <img
          src="/library-logo-final_2024.png"
          alt="LNU Logo"
          className="h-4 sm:h-6 md:h-8 lg:h-12 xl:h-12 2xl:h-14 ml-3 sm:ml-6"
        />
      </div>
    
      {/* Right side - Live Count, Date/Time, Weather */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-4 xl:space-x-8 text-xs sm:text-sm lg:text-base xl:text-lg">
        {/* Live Count */}
        <div className="text-center">
          <div className="font-bold text-orange-500 text-[12px] sm:text-base md:text-lg lg:text-[22px]">
            {liveCount}
          </div>
          <div className="text-[8px] sm:text-xs md:text-sm font-medium text-gray-600 leading-tight">
            <span className="hidden sm:inline">Live People Count</span>
            <span className="sm:text-xs sm:hidden">Live Count</span>
          </div>
        </div>
    
        {/* Date and Time */}
        <div className="text-right -space-y-0.5 lg:space-y-1 sm:-space-y-1">
          <div className="font-medium text-[8px] sm:text-xs md:text-sm lg:text-[15px] text-gray-700">
            {formattedDate}
          </div>
          <div className="text-[9px] sm:text-xs md:text-sm lg:text-[16px] text-right font-semibold text-gray-600">
            {formattedTime}
          </div>
        </div>
    
        {/* Weather - Compact for mobile */}
        <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 lg:space-x-3 xl:space-x-6 text-gray-700">
          {weather && (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="flex items-center">
                <FaTemperatureHigh className="text-red-400 mr-0.5 sm:mr-1 text-[10px] sm:text-sm lg:text-[16px]" />
                <span className="text-[10px] sm:text-xs md:text-sm lg:text-[16px]">{weather.temp}°C</span>
              </div>
              <div className="flex items-center">
                <FaTint className="text-blue-300 mr-0.5 sm:mr-1 text-[10px] sm:text-sm lg:text-[16px]" />
                <span className="text-[10px] sm:text-xs md:text-sm lg:text-[16px]">{weather.humidity}%</span>
              </div>
            </div>
          )}
          
          {airQuality && (
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* PM2.5 - Always visible */}
              <div className="flex items-center">
                <FaWind className="text-gray-600 mr-0.5 sm:mr-1 text-[10px] sm:text-sm lg:text-[16px]" />
                <span className="text-gray-600 font-medium text-[9px] sm:text-[10px] md:text-xs lg:text-[16px]">
                  <span className="sm:inline">PM2.5:</span>
                </span>
                <span
                  className={`${
                    getPM25Level(airQuality.pm25).color
                  } font-semibold ml-0.5 text-[10px] sm:text-xs md:text-sm lg:text-base`}
                >
                  {airQuality.pm25.toFixed(1)}
                </span>
              </div>
              
              {/* PM10 - Hidden on very small screens */}
              <div className="hidden sm:flex items-center">
                <FaWind className="text-gray-400 mr-1 text-xs sm:text-sm lg:text-[16px]" />
                <span className="text-gray-500 font-medium text-[10px] md:text-xs lg:text-[16px]">PM10:</span>
                <span
                  className={`${
                    getPM10Level(airQuality.pm10).color
                  } font-medium ml-0.5 text-xs md:text-sm lg:text-base`}
                >
                  {airQuality.pm10.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;