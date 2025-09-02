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
    public class SessionTimeController : ControllerBase
    {
        private readonly PunchIn_System_DbContext _context;
        private readonly ILogger<SessionTimeController> _logger;

        public SessionTimeController(PunchIn_System_DbContext context, ILogger<SessionTimeController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/SessionTime
        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<SessionTimeDTO>>> GetSessionTimes()
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                IQueryable<SessionTime> query = _context.SessionTimes;

                // If Admin, only return sessions for their company
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

                    query = query.Where(s => companyEmployeeIds.Contains(s.EmployeeId));
                }

                var sessionTimes = await query.ToListAsync();
                return Ok(sessionTimes.Select(MapToDTO));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving session times");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving session times");
            }
        }

        // GET: api/SessionTime/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SessionTimeDTO>> GetSessionTime(int id)
        {
            try
            {
                var sessionTime = await _context.SessionTimes.FindAsync(id);

                if (sessionTime == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the session belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (sessionTime.EmployeeId != employeeId)
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

                    var employee = await _context.Employees.FindAsync(sessionTime.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                return Ok(MapToDTO(sessionTime));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving session time with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving session time");
            }
        }

        // POST: api/SessionTime
        [HttpPost]
        public async Task<ActionResult<SessionTimeDTO>> CreateSessionTime(CreateSessionTimeDTO sessionTimeDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // Verify the employee exists
                var employee = await _context.Employees.FindAsync(sessionTimeDTO.EmployeeId);
                if (employee == null)
                {
                    return BadRequest("Employee not found");
                }

                // Verify the punch exists
                var punch = await _context.PunchIns.FindAsync(sessionTimeDTO.PunchId);
                if (punch == null)
                {
                    return BadRequest("Punch not found");
                }

                // If employee, check if they are creating a session for themselves
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (sessionTimeDTO.EmployeeId != employeeId)
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
                        return BadRequest("You can only create sessions for employees in your company");
                    }
                }

                var sessionTime = new SessionTime
                {
                    PunchId = sessionTimeDTO.PunchId,
                    EmployeeId = sessionTimeDTO.EmployeeId,
                    SessionStatus = sessionTimeDTO.SessionStatus,
                    SessionStartTime = sessionTimeDTO.SessionStartTime,
                    SessionEndTime = sessionTimeDTO.SessionEndTime,
                    SessionLocationLong = sessionTimeDTO.SessionLocationLong,
                    SessionLocationLat = sessionTimeDTO.SessionLocationLat,
                    SessionBreakTime = sessionTimeDTO.SessionBreakTime
                };

                _context.SessionTimes.Add(sessionTime);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetSessionTime), new { id = sessionTime.SessionId }, MapToDTO(sessionTime));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating session time");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error creating session time");
            }
        }

        // PUT: api/SessionTime/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSessionTime(int id, UpdateSessionTimeDTO sessionTimeDTO)
        {
            try
            {
                var sessionTime = await _context.SessionTimes.FindAsync(id);
                if (sessionTime == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the session belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (sessionTime.EmployeeId != employeeId)
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

                    var employee = await _context.Employees.FindAsync(sessionTime.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                // Update properties
                if (!string.IsNullOrEmpty(sessionTimeDTO.SessionStatus))
                {
                    sessionTime.SessionStatus = sessionTimeDTO.SessionStatus;
                }

                if (sessionTimeDTO.SessionEndTime.HasValue)
                {
                    sessionTime.SessionEndTime = sessionTimeDTO.SessionEndTime;
                }

                if (sessionTimeDTO.SessionBreakTime.HasValue)
                {
                    sessionTime.SessionBreakTime = sessionTimeDTO.SessionBreakTime;
                }

                _context.Entry(sessionTime).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating session time with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error updating session time");
            }
        }

        // DELETE: api/SessionTime/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteSessionTime(int id)
        {
            try
            {
                var sessionTime = await _context.SessionTimes.FindAsync(id);
                if (sessionTime == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If Admin, check if the session belongs to an employee in their company
                if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(sessionTime.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                _context.SessionTimes.Remove(sessionTime);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting session time with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error deleting session time");
            }
        }

        private static SessionTimeDTO MapToDTO(SessionTime sessionTime) =>
            new()
            {
                SessionId = sessionTime.SessionId,
                PunchId = sessionTime.PunchId,
                EmployeeId = sessionTime.EmployeeId,
                SessionStatus = sessionTime.SessionStatus,
                SessionStartTime = sessionTime.SessionStartTime,
                SessionEndTime = sessionTime.SessionEndTime,
                SessionLocationLong = sessionTime.SessionLocationLong,
                SessionLocationLat = sessionTime.SessionLocationLat,
                SessionBreakTime = sessionTime.SessionBreakTime
            };
    }
}