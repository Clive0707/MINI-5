# 🧠 Dementia Tracker

A comprehensive web application for monitoring cognitive health and assessing dementia risk through various cognitive tests and evaluations.

## ✨ Features

- **Cognitive Testing**: Multiple test types including Pattern Recognition, Stroop Test, and Word Recall
- **Risk Assessment**: AI-powered dementia risk evaluation based on multiple factors
- **User Management**: Secure authentication and user profile management
- **Progress Tracking**: Monitor cognitive performance over time
- **Report Generation**: Generate comprehensive PDF reports
- **Responsive Design**: Modern, accessible web interface

## 🚀 Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite3** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **jsPDF** for report generation

### Frontend
- **React.js** with React Router
- **Tailwind CSS** for styling
- **Axios** for API communication
- **Lucide React** for icons

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/dementia-tracker.git
   cd dementia-tracker
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   JWT_SECRET=your-secret-key-here
   FRONTEND_URL=http://localhost:3000
   ```

## 🚀 Running the Application

### Start Backend Server
```bash
npm start
```
The backend will run on `http://localhost:5000`

### Start Frontend Development Server
```bash
cd frontend
npm start
```
The frontend will run on `http://localhost:3000`

## 🔐 Default Admin Account

- **Email**: `admin@dementiatracker.com`
- **Password**: `admin123`

## 📁 Project Structure

```
dementia-tracker/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API services
│   └── public/             # Static assets
├── database/               # Database initialization and schema
├── services/               # Backend services
├── server.js              # Main backend server file
└── package.json           # Backend dependencies
```

## 🧪 Available Tests

1. **Pattern Recognition Test**: Visual pattern matching and memory
2. **Stroop Test**: Cognitive flexibility and attention
3. **Word Recall Test**: Memory and learning assessment

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Tests
- `POST /api/tests/submit` - Submit test results
- `GET /api/tests/history` - Get test history

### Evaluation
- `POST /api/evaluation/evaluate` - Risk evaluation

### Reports
- `GET /api/reports/generate` - Generate PDF report

## 📊 Risk Assessment Factors

The system evaluates dementia risk based on:
- Age
- Family history
- Medical conditions
- Cognitive test performance
- Lifestyle factors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application is for educational and monitoring purposes only. It is not a substitute for professional medical advice. Please consult with healthcare providers for medical decisions.

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

**Built with ❤️ for cognitive health awareness**
