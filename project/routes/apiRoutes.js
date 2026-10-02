import express from "express";
import axios from "axios";

const router = express.Router();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const MANDI_API_KEY = process.env.MANDI_API_KEY;

// 🌤️ Weather API
router.get("/weather", async (req, res) => {
  let { lat, lon, city } = req.query;

  try {
    let query = "";
    if (lat && lon) query = `${lat},${lon}`;
    else if (city) query = city;
    else query = "Mumbai";

    const url = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query)}&aqi=no`;
    const response = await axios.get(url);
    const data = response.data;

    res.json({
      city: data.location.name,
      region: data.location.region,
      country: data.location.country,
      temperature: `${data.current.temp_c}°C`,
      feels_like: `${data.current.feelslike_c}°C`,
      humidity: `${data.current.humidity}%`,
      wind_speed: `${data.current.wind_kph} kph`,
      condition: data.current.condition.text,
      local_time: data.location.localtime,
    });
  } catch (error) {
    console.error("❌ Weather API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Unable to fetch weather data" });
  }
});

// 🌾 Mandi API
router.get("/mandi", async (req, res) => {
  let { state, commodity } = req.query;

  if (!MANDI_API_KEY) {
    return res.status(500).json({ error: "Server config error: MANDI_API_KEY missing" });
  }

  const stateMap = {
    "Maharashtra": "Maharashtra",
    "Gujarat": "Gujarat",
    "Karnataka": "Karnataka",
    "Uttar Pradesh": "Uttar Pradesh",
    "Rajasthan": "Rajasthan",
    "Punjab": "Punjab",
    "Tamil Nadu": "Tamil Nadu",
    "West Bengal": "West Bengal",
    "Delhi": "Delhi",
  };
  if (stateMap[state]) state = stateMap[state];

  try {
    let url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${MANDI_API_KEY}&format=json&limit=50`;
    if (commodity) url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
    if (state) url += `&filters[state]=${encodeURIComponent(state)}`;

    const response = await axios.get(url);
    const records = response.data?.records || [];

    res.json({
      count: records.length,
      mandi_data: records.map((item) => ({
        market: item.market,
        district: item.district,
        state: item.state,
        commodity: item.commodity,
        min_price: item.min_price,
        max_price: item.max_price,
        modal_price: item.modal_price,
        arrival_date: item.arrival_date,
      })),
    });
  } catch (error) {
    console.error("❌ Mandi API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Unable to fetch Mandi price data" });
  }
});

export default router;
