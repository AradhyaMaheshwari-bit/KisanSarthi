# 🌾 KisanSarthi — AI Agricultural Assistant

> Helping Indian farmers with crop prices, disease detection & farming advice powered by AI

## 👥 Team
| Name | Role |
|------|------|
| Saurabh | Frontend Developer (HTML, CSS, JavaScript, UI/UX) |
| Rahul | Data Analyst (Python, ML Price Forecasting, Data Pipeline) |

## 📌 About the Project
KisanSarthi is an AI-powered web application designed for Indian farmers.
It provides real-time crop price trends, 30-day price forecasting,
plant disease detection, and farming advice — all in one place.

## 📁 Project Structure
| File | Description |
|------|-------------|
| index.html | Main frontend UI |
| style.css | Styling and responsive design |
| app.js | Frontend logic and Claude AI API integration |
| proxy.js | Node.js proxy server for API calls |
| script_py.py | Python data pipeline (cleaning + forecasting) |
| price_data.json | Processed crop price dataset (output of script) |

## 🔬 Data Analysis (by Rahul)
- Collected and processed real **APMC market crop price data**
- Cleaned data — handled missing values and duplicates using **Pandas**
- Removed price outliers using **IQR (Interquartile Range)** method
- Built **30-day price forecast** using **Linear Regression (Scikit-learn)**
- Analyzed **60-day historical price trends** across multiple crops
- Exported structured **JSON data** consumed by the frontend

## 🎨 Frontend (by Saurabh)
- Built complete UI using **HTML, CSS, JavaScript**
- Integrated **Claude AI API** for farming advice and disease detection
- Responsive design for mobile and desktop
- Real-time crop price display with charts

## 🛠 Tech Stack
| Technology | Used For |
|------------|----------|
| Python | Data analysis and forecasting |
| Pandas & NumPy | Data cleaning and processing |
| Scikit-learn | Linear Regression price forecast |
| HTML/CSS/JS | Frontend UI |
| Claude AI API | AI farming assistant |
| Node.js | Proxy server |

## 🚀 How to Run
1. Install Node.js
2. Run `node proxy.js` to start the server
3. Open `http://localhost:3001` in browser
4. Enter your Anthropic API key when prompted

## 📊 Data Pipeline
Raw APMC CSV Data
↓
Clean & Remove Outliers (IQR)
↓
Calculate 7-day avg, 30-day change %
↓
Linear Regression Forecast (30 days)
↓
Export to price_data.json
↓
Frontend displays live price charts
## 🎯 Key Features
- 📈 Real-time crop price trends
- 🔮 30-day price forecasting using ML
- 🌿 Plant disease detection via AI
- 💬 Farming advice chatbot
- 📱 Mobile responsive design

## 🏫 Project Info
- **Type:** BCA Student Project
- **Domain:** AI + Data Analytics + AgriTech
- **Target Users:** Indian Farmers
