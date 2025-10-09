# 🕐 PunchIn System

A comprehensive employee time tracking and attendance management system with advanced monitoring capabilities, face recognition technology, and real-time activity tracking.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The PunchIn System is a modern, enterprise-grade employee attendance and time tracking solution that combines web-based management with advanced Windows agent monitoring. It provides real-time attendance tracking, face recognition authentication, location-based verification, and comprehensive analytics.

### Key Components

- **🌐 Web Application** - Angular-based frontend with responsive design
- **🔧 API Backend** - ASP.NET Core Web API with JWT authentication
- **🖥️ Windows Agent** - Background service for activity monitoring
- **📊 Analytics Dashboard** - Real-time attendance statistics and reports

## ✨ Features

### Core Attendance Features
- **🕐 Real-time Punch In/Out** - Precise time tracking with location verification
- **👤 Face Recognition** - AI-powered biometric authentication
- **📍 Location Tracking** - GPS and IP-based location verification
- **🔒 Enterprise Security** - Bank-level encryption and secure data transmission

### Advanced Monitoring
- **🖥️ Activity Monitoring** - Tracks applications and user activity
- **⏰ Idle Detection** - Monitors user inactivity with configurable thresholds
- **🔄 Session Management** - Automatic session start/end based on user activity
- **💓 Heartbeat System** - Regular communication with monitoring services

### Management & Analytics
- **📊 Real-time Dashboard** - Live attendance statistics and metrics
- **👥 Multi-Company Support** - Manage multiple organizations
- **🎯 Role-Based Access** - Admin, SuperAdmin, and Employee roles
- **📈 Comprehensive Reports** - Detailed attendance and productivity analytics
- **🏢 Company Management** - Complete organizational structure management

### Technical Features
- **🔐 JWT Authentication** - Secure token-based authentication
- **🌐 RESTful API** - Well-documented API endpoints
- **🔄 Auto-Start Service** - Windows service integration
- **🖥️ PC-Focused Design** - Optimized for desktop and laptop computers

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PunchIn System                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Angular)     │  Backend (ASP.NET Core)              │
│  ├─ Web Application     │  ├─ REST API                         │
│  ├─ Dashboard          │  ├─ Authentication                   │
│  ├─ Employee Portal    │  ├─ Database Layer                   │
│  └─ Admin Panel        │  └─ Business Logic                   │
├─────────────────────────────────────────────────────────────────┤
│  Windows Agent         │  External Services                    │
│  ├─ Activity Monitor   │  ├─ Face Recognition API             │
│  ├─ Location Tracker   │  ├─ Location Services                 │
│  ├─ Idle Detection     │  └─ Notification Services             │
│  └─ Heartbeat Service  │                                       │
├─────────────────────────────────────────────────────────────────┤
│  Database (SQL Server) │                                       │
│  ├─ User Management    │                                       │
│  ├─ Attendance Records │                                       │
│  ├─ Session Data       │                                       │
│  └─ Analytics Data     │                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **Operating System**: Windows 10/11 (for Windows Agent)
- **Database**: SQL Server 2019 or later
- **Runtime**: .NET 8.0 SDK
- **Browser**: Chrome 90+, Edge 90+, Firefox 88+
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free space

### Development Requirements
- **Node.js**: 18.x or later
- **Angular CLI**: 20.x
- **Visual Studio**: 2022 or VS Code
- **Git**: Latest version

## 🚀 Installation

### Quick Start (Development)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/PunchIn_System.git
   cd PunchIn_System
   ```

2. **Database Setup**
   ```sql
   -- Create database
   CREATE DATABASE PunchInSystem;
   
   -- Run migration scripts
   -- Execute AgentTables_Migration.sql
   ```

3. **Backend Setup**
   ```bash
   cd PunchIn_API/PunchIn_API
   dotnet restore
   dotnet run
   # API will be available at https://localhost:7127
   ```

4. **Frontend Setup**
   ```bash
   cd Web_PunchIn_System
   npm install
   npm start
   # Application will be available at http://localhost:5858
   ```

5. **Windows Agent Setup**
   ```bash
   cd PunchIn_API/PunchInSystem.Agent
   dotnet run
   # Agent will run in console mode for development
   ```

### Production Installation

#### 1. Database Configuration
```sql
-- Create production database
CREATE DATABASE PunchInSystem_Production;

-- Configure connection string in appsettings.json
-- Update database name and connection details
```

#### 2. API Deployment
```bash
# Build for production
dotnet publish -c Release -o ./publish

# Deploy to IIS or Docker
# Configure SSL certificates
# Set up environment variables
```

#### 3. Frontend Deployment
```bash
# Build Angular application
ng build --configuration production

# Deploy to web server (IIS, Apache, Nginx)
# Configure reverse proxy if needed
```

#### 4. Windows Agent Installation
```bash
# Install as Windows Service
sc create "PunchInAgent" binPath="C:\Path\To\PunchInSystem.Agent.exe"
sc start "PunchInAgent"

# Configure auto-start
sc config "PunchInAgent" start=auto
```

## ⚙️ Configuration

### API Configuration (`appsettings.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PunchInSystem;Trusted_Connection=true;"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key-here",
    "Issuer": "PunchInSystem",
    "Audience": "PunchInSystem-Users",
    "ExpiryMinutes": 60
  },
  "FaceRecognition": {
    "ModelPath": "./Models/face-api",
    "ConfidenceThreshold": 0.6
  },
  "LocationSettings": {
    "EnableGPS": true,
    "EnableIPLocation": true,
    "AccuracyThreshold": 100
  }
}
```

### Agent Configuration (`appsettings.json`)
```json
{
   "ApiSettings": {
     "BaseUrl": "https://localhost:7127",
    "ApiKey": "your-api-key",
    "HeartbeatInterval": 30
  },
  "MonitoringSettings": {
    "IdleThreshold": 300,
    "ActivityCheckInterval": 10,
    "EnableLocationTracking": true
  }
}
```

### Frontend Configuration
```typescript
// src/app/config/api.config.ts
export const API_CONFIG = {
  baseUrl: 'https://localhost:7127/api',
  timeout: 30000,
  retryAttempts: 3
};
```

## 📖 Usage

### For Employees

1. **Login** - Use company credentials or face recognition
2. **Punch In/Out** - Click the punch button or use face recognition
3. **View Attendance** - Check your attendance history and current status
4. **Profile Management** - Update personal information and preferences

### For Administrators

1. **Dashboard** - View real-time attendance statistics
2. **Employee Management** - Add, edit, and manage employee records
3. **Reports** - Generate attendance and productivity reports
4. **Company Settings** - Configure company policies and settings
5. **Analytics** - View detailed analytics and insights

### For Super Administrators

1. **Multi-Company Management** - Manage multiple organizations
2. **System Configuration** - Configure global system settings
3. **User Management** - Manage all users across companies
4. **System Monitoring** - Monitor system health and performance

## 🔌 API Documentation

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
```

### Employee Endpoints
```
GET    /api/employee/dashboard/stats
GET    /api/employee/attendance
POST   /api/employee/punchin
POST   /api/employee/punchout
GET    /api/employee/profile
PUT    /api/employee/profile
```

### Admin Endpoints
```
GET    /api/admin/employees
POST   /api/admin/employees
PUT    /api/admin/employees/{id}
DELETE /api/admin/employees/{id}
GET    /api/admin/reports
POST   /api/admin/reports/generate
```

### Agent Endpoints
```
POST   /api/agent/session/start
POST   /api/agent/session/end
POST   /api/agent/heartbeat
POST   /api/agent/activity
GET    /api/agent/status
```

### Face Recognition Endpoints
```
POST   /api/face/register
POST   /api/face/verify
DELETE /api/face/remove/{employeeId}
```

## 🛠️ Development

### Project Structure
```
PunchIn_System/
├── Web_PunchIn_System/          # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/        # Feature modules
│   │   │   ├── shared/          # Shared components
│   │   │   └── core/            # Core services
│   │   └── assets/              # Static assets
│   └── package.json
├── PunchIn_API/                 # Backend API
│   ├── Controllers/             # API Controllers
│   ├── Models/                  # Data Models
│   ├── Services/                # Business Logic
│   ├── Data/                    # Database Context
│   └── DTOs/                    # Data Transfer Objects
└── PunchInSystem.Agent/         # Windows Agent
    ├── Services/                # Agent Services
    ├── Models/                  # Agent Models
    └── Utils/                   # Utility Classes
```

### Development Commands

#### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

#### Backend Development
```bash
# Restore packages
dotnet restore

# Run in development mode
dotnet run

# Run tests
dotnet test

# Build for production
dotnet build -c Release
```

#### Agent Development
```bash
# Run agent in console mode
dotnet run

# Install as Windows service
dotnet publish -c Release
sc create "PunchInAgent" binPath="path\to\agent.exe"
```

### Code Style Guidelines
- **C#**: Follow Microsoft C# coding conventions
- **TypeScript**: Use Angular style guide
- **HTML**: Use semantic HTML5 elements
- **CSS**: Use Tailwind CSS utility classes
- **Comments**: Document complex business logic

## 🚀 Deployment

### Docker Deployment
```dockerfile
# API Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
COPY . /app
WORKDIR /app
EXPOSE 80
ENTRYPOINT ["dotnet", "PunchInSystem.API.dll"]
```

### IIS Deployment
1. Install IIS and ASP.NET Core Hosting Bundle
2. Configure application pool
3. Set up SSL certificates
4. Configure web.config

### Azure Deployment
1. Create Azure App Service
2. Configure SQL Database
3. Set up Application Insights
4. Configure custom domains

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Write unit tests for new features
- Follow existing code style
- Update documentation for API changes
- Test thoroughly before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- 📧 Email: shubhpatel269@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/shubhpatel269/PunchIn_System/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/shubhpatel269/PunchIn_System/discussions)

## 🙏 Acknowledgments

- Angular team for the amazing framework
- ASP.NET Core team for the robust backend framework
- PrimeNG for the excellent UI components
- Face-api.js for face recognition capabilities
- All contributors and testers

---

**Made with ❤️ by the PunchIn System Team**
