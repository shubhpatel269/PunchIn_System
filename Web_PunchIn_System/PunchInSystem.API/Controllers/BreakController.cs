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
    public class BreakController : ControllerBase
    {
        private readonly PunchIn_System_DbContext _context;
        private readonly ILogger<BreakController> _logger;

        public BreakController(PunchIn_System_DbContext context, ILogger<BreakController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Break
        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<BreakDTO>>> GetBreaks()
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                IQueryable<Break> query = _context.Breaks;

                // If Admin, only return breaks for their company
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

                    query = query.Where(b => companyEmployeeIds.Contains(b.EmployeeId));
                }

                var breaks = await query.ToListAsync();
                return Ok(breaks.Select(MapToDTO));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving breaks");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving breaks");
            }
        }

        // GET: api/Break/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BreakDTO>> GetBreak(int id)
        {
            try
            {
                var breakEntity = await _context.Breaks.FindAsync(id);

                if (breakEntity == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the break belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (breakEntity.EmployeeId != employeeId)
                    {
                        return Forbid();
                    }
                }
                // If Admin, check if the break belongs to an employee in their company
                else if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(breakEntity.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                return Ok(MapToDTO(breakEntity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving break with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving break");
            }
        }

        // GET: api/Break/Session/5
        [HttpGet("Session/{sessionId}")]
        public async Task<ActionResult<IEnumerable<BreakDTO>>> GetBreaksBySession(int sessionId)
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

                var breaks = await _context.Breaks
                    .Where(b => b.SessionId == sessionId)
                    .OrderBy(b => b.BreakStart)
                    .ToListAsync();

                return Ok(breaks.Select(MapToDTO));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving breaks for session ID: {sessionId}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving breaks");
            }
        }

        // POST: api/Break
        [HttpPost]
        public async Task<ActionResult<BreakDTO>> CreateBreak(CreateBreakDTO breakDTO)
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
                var session = await _context.SessionTimes.FindAsync(breakDTO.SessionId);
                if (session == null)
                {
                    return BadRequest("Session not found");
                }

                // Verify the employee exists
                var employee = await _context.Employees.FindAsync(breakDTO.EmployeeId);
                if (employee == null)
                {
                    return BadRequest("Employee not found");
                }

                // If employee, check if they are creating a break for themselves
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (breakDTO.EmployeeId != employeeId)
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
                        return BadRequest("You can only create breaks for employees in your company");
                    }
                }

                var breakEntity = new Break
                {
                    SessionId = breakDTO.SessionId,
                    EmployeeId = breakDTO.EmployeeId,
                    BreakStart = breakDTO.BreakStart,
                    BreakEnd = breakDTO.BreakEnd,
                    BreakType = breakDTO.BreakType,
                    BreakCreatedAt = DateTime.UtcNow
                };

                _context.Breaks.Add(breakEntity);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetBreak), new { id = breakEntity.BreakId }, MapToDTO(breakEntity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating break");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error creating break");
            }
        }

        // PUT: api/Break/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBreak(int id, UpdateBreakDTO breakDTO)
        {
            try
            {
                var breakEntity = await _context.Breaks.FindAsync(id);
                if (breakEntity == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If employee, check if the break belongs to them
                if (currentUserRole == "Employee")
                {
                    var employeeId = currentUserId;
                    if (breakEntity.EmployeeId != employeeId)
                    {
                        return Forbid();
                    }
                }
                // If Admin, check if the break belongs to an employee in their company
                else if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(breakEntity.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                // Update properties
                if (breakDTO.BreakEnd.HasValue)
                {
                    breakEntity.BreakEnd = breakDTO.BreakEnd;
                }

                if (!string.IsNullOrEmpty(breakDTO.BreakType))
                {
                    breakEntity.BreakType = breakDTO.BreakType;
                }

                _context.Entry(breakEntity).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating break with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error updating break");
            }
        }

        // DELETE: api/Break/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteBreak(int id)
        {
            try
            {
                var breakEntity = await _context.Breaks.FindAsync(id);
                if (breakEntity == null)
                {
                    return NotFound();
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                // If Admin, check if the break belongs to an employee in their company
                if (currentUserRole == "Admin")
                {
                    var adminId = int.Parse(currentUserId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    if (admin == null)
                    {
                        return Forbid();
                    }

                    var employee = await _context.Employees.FindAsync(breakEntity.EmployeeId);
                    if (employee == null || employee.CompanyId != admin.CompanyId)
                    {
                        return Forbid();
                    }
                }

                _context.Breaks.Remove(breakEntity);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting break with ID: {id}");
                return StatusCode((int)HttpStatusCode.InternalServerError, "Error deleting break");
            }
        }

        private static BreakDTO MapToDTO(Break breakEntity) =>
            new()
            {
                BreakId = breakEntity.BreakId,
                SessionId = breakEntity.SessionId,
                EmployeeId = breakEntity.EmployeeId,
                BreakStart = breakEntity.BreakStart,
                BreakEnd = breakEntity.BreakEnd,
                BreakType = breakEntity.BreakType,
                BreakCreatedAt = breakEntity.BreakCreatedAt
            };
    }
}