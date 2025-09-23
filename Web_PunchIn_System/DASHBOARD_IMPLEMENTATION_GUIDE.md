# Admin Dashboard Implementation Guide

## 📊 Dashboard Overview
The admin dashboard shows real-time attendance statistics for today only, with proper attendance rate calculation.

## 🔗 API Endpoints

### 1. Main Dashboard Statistics
**Endpoint:** `GET /api/Employee/Dashboard/Stats`  
**Authorization:** Requires Admin or SuperAdmin role  
**Response:**
```json
{
  "totalPunchInsToday": 150,
  "activeSessionsToday": 25,
  "employeesOnBreakToday": 5,
  "totalEmployees": 100,
  "employeesWhoPunchedInToday": 85,
  "attendanceRate": 85.00
}
```

### 2. Individual Metric Endpoints

#### Total Punch-ins Today
**Endpoint:** `GET /api/Employee/Dashboard/TodayPunchIns`  
**Response:**
```json
{
  "totalPunchIns": 150,
  "date": "2025-01-23T00:00:00Z"
}
```

#### Active Sessions Today
**Endpoint:** `GET /api/Employee/Dashboard/ActiveSessions`  
**Response:**
```json
{
  "activeSessionCount": 25,
  "sessions": [
    {
      "sessionId": 1,
      "employeeId": "EMP001",
      "employeeName": "John Doe",
      "sessionStartTime": "2025-01-23T09:00:00Z",
      "sessionStatus": "Active"
    }
  ]
}
```

#### Employees on Break Today
**Endpoint:** `GET /api/Employee/Dashboard/EmployeesOnBreak`  
**Response:**
```json
{
  "employeesOnBreakCount": 5,
  "employees": [
    {
      "breakId": 1,
      "employeeId": "EMP001",
      "employeeName": "John Doe",
      "breakStart": "2025-01-23T12:00:00Z",
      "breakType": "Lunch"
    }
  ]
}
```

#### Company Employee Count
**Endpoint:** `GET /api/Employee/Dashboard/CompanyEmployeeCount/{companyId}`  
**Response:**
```json
{
  "companyId": 1,
  "companyName": "Company Name",
  "totalEmployees": 100,
  "activeEmployees": 85
}
```

## 🎯 Attendance Rate Calculation

### Formula
```
Attendance Rate = (Employees Who Punched In Today / Total Employees) × 100
```

### Key Points
- **Distinct Count**: Each employee is counted only once, regardless of multiple punch-ins
- **Today Only**: Only counts employees who punched in today
- **Prevents Division by Zero**: Returns 0% if totalEmployees = 0
- **Precision**: Rounded to 2 decimal places

### Example Scenarios

#### Scenario 1: Normal Day
- Total Employees: 100
- Employees who punched in today: 85
- **Attendance Rate: 85%**

#### Scenario 2: Multiple Punch-ins
- Employee A punches in 3 times today
- Employee B punches in 1 time today  
- Employee C doesn't punch in
- Total Employees: 3
- Employees who punched in today: 2 (A and B, counted only once each)
- **Attendance Rate: 66.67%**

#### Scenario 3: No Employees
- Total Employees: 0
- **Attendance Rate: 0%** (prevents division by zero)

## 🎨 Frontend Implementation

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Date + Auto-refresh indicator                      │
│ Total Employees: 100 | Present Today: 85 | Rate: 85.00%    │
├─────────────────────────────────────────────────────────────┤
│ [Total Punch-ins] [Active Sessions] [On Break] [Present] [Rate] │
│     150             25            5        85      85.00%   │
├─────────────────────────────────────────────────────────────┤
│ Recent Employee Attendance Table                           │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Cards (5 Cards)
1. **Total Punch-ins Today** - Blue card with users icon
2. **Active Sessions Today** - Green card with users icon  
3. **On Break Today** - Yellow card with clock icon
4. **Employees Present Today** - Purple card with user-check icon
5. **Attendance Rate** - Blue card with chart-pie icon

### Auto-refresh Implementation
```typescript
// Auto-refresh every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchDashboardStats();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

### Loading States
- Show animated placeholders (--) while loading
- Pulse animation for loading indicators
- Smooth transitions between states

### Error Handling
- Toast notifications for API errors
- Graceful fallback to empty states
- Retry mechanism for failed requests

## 🔧 Technical Requirements

### Authentication
- All endpoints require JWT token in Authorization header
- Admin role required for all dashboard endpoints
- SuperAdmin can see all companies, Admin sees only their company

### Data Refresh Strategy
- **Auto-refresh**: Every 30 seconds
- **Manual refresh**: Click on cards for detailed views
- **Real-time**: WebSocket connections (optional)

### Responsive Design
- **Desktop**: 5 cards per row
- **Tablet**: 2-3 cards per row  
- **Mobile**: 1 card per row
- Proper spacing and shadows for card elevation

## 📱 UI Components

### Card Structure
```html
<div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
  <div class="flex items-start justify-between">
    <div>
      <div class="text-sm font-medium text-gray-500 uppercase tracking-wider">Card Title</div>
      <div class="mt-2">
        <div class="text-4xl font-bold text-gray-800">{{value}}</div>
        <div class="flex items-center mt-2">
          <span class="text-xs text-gray-500">Description</span>
        </div>
      </div>
    </div>
    <div class="bg-color-50 p-3 rounded-lg">
      <i class="pi pi-icon text-color-500 text-2xl"></i>
    </div>
  </div>
</div>
```

### Color Scheme
- **Blue**: Total Punch-ins, Attendance Rate
- **Green**: Active Sessions
- **Yellow**: On Break
- **Purple**: Employees Present
- **Gray**: Loading states

## ✅ Implementation Checklist

### API Integration
- [ ] Implement all 5 dashboard endpoints
- [ ] Add proper error handling
- [ ] Include authentication headers
- [ ] Handle loading states

### UI Components  
- [ ] Create metric cards with icons
- [ ] Implement responsive grid layout
- [ ] Add loading states with animations
- [ ] Add hover effects and transitions

### Data Display
- [ ] Format numbers and percentages correctly
- [ ] Show current date in header
- [ ] Display total employees count
- [ ] Show attendance rate with 2 decimal places

### Real-time Features
- [ ] Auto-refresh functionality (30 seconds)
- [ ] Manual refresh option
- [ ] Error state handling
- [ ] Loading state management

### Styling
- [ ] Match the design specifications
- [ ] Use proper colors and icons
- [ ] Implement card shadows and rounded corners
- [ ] Ensure accessibility compliance

## 🚀 Ready to Implement!

All the backend endpoints are properly configured to return today's data only with correct attendance rate calculation. The frontend is ready to consume these APIs and display the dashboard exactly as specified.