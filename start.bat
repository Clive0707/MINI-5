@echo off
chcp 65001 >nul
echo 🧠 Starting Dementia Tracker...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

REM Create .env file if it doesn't exist
if not exist .env (
    echo 🔧 Creating .env file...
    (
        echo NODE_ENV=development
        echo PORT=5000
        echo JWT_SECRET=dementia-tracker-dev-secret-key
        echo FRONTEND_URL=http://localhost:3000
        echo EMAIL_USER=your-email@gmail.com
        echo EMAIL_PASS=your-app-password
    ) > .env
    echo ✅ .env file created
    echo ⚠️  Please update .env with your email credentials for notifications
)

REM Initialize database
echo 🗄️ Initializing database...
call npm run init-db
if %errorlevel% neq 0 (
    echo ❌ Failed to initialize database
    pause
    exit /b 1
)

echo ✅ Database initialized successfully

REM Start backend server
echo 🚀 Starting backend server...
start "Dementia Tracker Backend" cmd /k "npm run dev"

REM Wait for backend to start
echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Start frontend
echo 🚀 Starting frontend...
cd frontend
start "Dementia Tracker Frontend" cmd /k "npm start"
cd ..

echo.
echo 🎉 Dementia Tracker is starting up!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:5000
echo 📊 Health Check: http://localhost:5000/api/health
echo.
echo 🧪 Demo Account:
echo    Email: admin@dementiatracker.com
echo    Password: admin123
echo.
echo Services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause
