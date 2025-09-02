using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;

namespace PunchInSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LocationLogController : ControllerBase
    {
        private readonly PunchIn_System_DbContext _context;
        private readonly ILogger<LocationLogController> _logger;

        public LocationLogController(PunchIn_System_DbContext context, ILogger<LocationLogController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/LocationLog
        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<LocationLogDTO>>> GetLocationLogs()
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                IQueryable<LocationLog> query = _context.LocationLogs;

                // If Admin, only return location logs for their company
                if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var companyId = admin.CompanyId;
                    var companyEmployeeIds = await _context.Employees
                        .Where(e => e.CompanyId == companyId && e.EmployeeIsDeleted == false)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    query = query.Where(l => companyEmployeeIds.Contains(l.EmployeeId));
                }

                var locationLogs = await query.ToListAsync();
                return Ok(locationLogs.Select(MapToDTO));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving location logs");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving location logs");
            }
        }

        // GET: api/LocationLog/5
        [HttpGet("{id}")]
        public async Task<ActionResult<LocationLogDTO>> GetLocationLog(int id)
        {
            try
            {
                var locationLog = await _context.LocationLogs.FindAsync(id);

                if (locationLog == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the location log belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (locationLog.EmployeeId != employeeId)
                    {
                        return Forbid();
                    }
                }
                // If Admin, check if the location log belongs to an employee in their company
                else if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(locationLog.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                return Ok(MapToDTO(locationLog));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving location log with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving location log");
            }
        }

        // GET: api/LocationLog/Session/5
        [HttpGet("Session/{sessionId}")]
        public async Task<ActionResult<IEnumerable<LocationLogDTO>>> GetLocationLogsBySession(int sessionId)
        {
            try
            {
                var session = await _context.SessionTimes.FindAsync(sessionId);
                if (session == null)
                {
                    return NotFound("Session not found");
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the session belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (session.EmployeeId != employeeId)
                    {
                        return Forbid();
                    }
                }
                // If Admin, check if the session belongs to an employee in their company
                else if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(session.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                var locationLogs = await _context.LocationLogs
                    .Where(l => l.SessionId == sessionId)
                    .OrderBy(l => l.LogTimestamp)
                    .ToListAsync();

                return Ok(locationLogs.Select(MapToDTO));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving location logs for session ID: {sessionId}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving location logs");
            }
        }

        // POST: api/LocationLog
        [HttpPost]
        public async Task<ActionResult<LocationLogDTO>> CreateLocationLog(CreateLocationLogDTO locationLogDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // Verify the session exists
                var session = await _context.SessionTimes.FindAsync(locationLogDTO.SessionId);
                if (session == null)
                {
                    return BadRequest("Session not found");
                }

                // Verify the employee exists
                var employee = await _context.Employees.FindAsync(locationLogDTO.EmployeeId);
                if (employee == null)
                {
                    return BadRequest("Employee not found");
                }

                // If employee, check if they are creating a location log for themselves
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (locationLogDTO.EmployeeId != employeeId)
                    {
                        return Forbid();
                    }
                }
                // If Admin, check if the employee belongs to their company
                else if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    if (employee.CompanyId != admin.CompanyId)
                    {
                        return BadRequest("You can only create location logs for employees in your company");
                    }
                }

                var locationLog = new LocationLog
                {
                    SessionId = locationLogDTO.SessionId,
                    EmployeeId = locationLogDTO.EmployeeId,
                    LogTimestamp = locationLogDTO.LogTimestamp,
                    LocationLong = locationLogDTO.LocationLong,
                    LocationLat = locationLogDTO.LocationLat,
                    LocationCreatedAt = DateTime.UtcNow
                };

                _context.LocationLogs.Add(locationLog);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetLocationLog), new { id = locationLog.LocationLogId }, MapToDTO(locationLog));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating location log");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error creating location log");
            }
        }

        // PUT: api/LocationLog/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLocationLog(int id, UpdateLocationLogDTO locationLogDTO)
        {
            try
            {
                var locationLog = await _context.LocationLogs.FindAsync(id);
                if (locationLog == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the location log belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (locationLog.EmployeeId != employeeId)
                    {
                        return Forbid();
                    }
                }
                // If Admin, check if the location log belongs to an employee in their company
                else if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(locationLog.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                // Update properties
                locationLog.LocationLong = locationLogDTO.LocationLong;
                locationLog.LocationLat = locationLogDTO.LocationLat;

                _context.Entry(locationLog).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating location log with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error updating location log");
            }
        }

        // DELETE: api/LocationLog/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteLocationLog(int id)
        {
            try
            {
                var locationLog = await _context.LocationLogs.FindAsync(id);
                if (locationLog == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If Admin, check if the location log belongs to an employee in their company
                if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(locationLog.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                _context.LocationLogs.Remove(locationLog);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting location log with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error deleting location log");
            }
        }

        private static LocationLogDTO MapToDTO(LocationLog locationLog) =>
            new()
            {
                LocationLogId = locationLog.LocationLogId,
                SessionId = locationLog.SessionId,
                EmployeeId = locationLog.EmployeeId,
                LogTimestamp = locationLog.LogTimestamp,
                LocationLong = locationLog.LocationLong,
                LocationLat = locationLog.LocationLat,
                LocationCreatedAt = locationLog.LocationCreatedAt
            };
    }
}