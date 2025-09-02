using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
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
    public class PunchInController : ControllerBase
    {
        private readonly PunchIn_System_DbContext _context;
        private readonly ILogger<PunchInController> _logger;
        private readonly IMapper _mapper;

        public PunchInController(PunchIn_System_DbContext context, ILogger<PunchInController> logger, IMapper mapper)
        {
            _context = context;
            _logger = logger;
            _mapper = mapper;
        }

        // GET: api/PunchIn
        [HttpGet]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<IEnumerable<PunchInDTO>>> GetPunchIns()
        {
            try
            {
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                
                if (userRole == "SuperAdmin")
                {
                    var punchIns = await _context.PunchIns.ToListAsync();
                    return Ok(_mapper.Map<IEnumerable<PunchInDTO>>(punchIns));
                }
                else if (userRole == "Admin")
                {
                    var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                    var admin = await _context.Admins.FindAsync(adminId);
                    
                    if (admin == null)
                        return Forbid();

                    var companyEmployees = await _context.Employees
                        .Where(e => e.CompanyId == admin.CompanyId)
                        .Select(e => e.EmployeeId)
                        .ToListAsync();

                    var punchIns = await _context.PunchIns
                        .Where(p => companyEmployees.Contains(p.EmployeeId))
                        .ToListAsync();

                    return Ok(_mapper.Map<IEnumerable<PunchInDTO>>(punchIns));
                }

                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting punch-ins");
                return StatusCode((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.");
            }
        }

        // GET: api/PunchIn/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PunchInDTO>> GetPunchIn(int id)
        {
            try
            {
                var punchIn = await _context.PunchIns.FindAsync(id);

                if (punchIn == null)
                    return NotFound();

                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (userRole == "SuperAdmin")
                {
                    return Ok(_mapper.Map<PunchInDTO>(punchIn));
                }
                else if (userRole == "Admin")
                {
                    var adminId = int.Parse(userId);
                var admin = await _context.Admins.FindAsync(adminId);
                
                if (admin == null)
                    return Forbid();

                var employeeRecord = await _context.Employees
                    .FirstOrDefaultAsync(e => e.EmployeeId == punchIn.EmployeeId && e.CompanyId == admin.CompanyId);

                    if (employeeRecord == null)
                        return Forbid();

                    return Ok(_mapper.Map<PunchInDTO>(punchIn));
                }
                else if (userRole == "Employee")
                {
                    if (userId != punchIn.EmployeeId)
                        return Forbid();

                    return Ok(_mapper.Map<PunchInDTO>(punchIn));
                }

                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting punch-in with ID {Id}", id);
                return StatusCode((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.");
            }
        }

        // GET: api/PunchIn/Employee/{employeeId}
        [HttpGet("Employee/{employeeId}")]
        public async Task<ActionResult<IEnumerable<PunchInDTO>>> GetPunchInsByEmployee(string employeeId)
        {
            try
            {
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (userRole == "SuperAdmin")
                {
                    var punchIns = await _context.PunchIns
                        .Where(p => p.EmployeeId == employeeId)
                        .ToListAsync();

                    return Ok(_mapper.Map<IEnumerable<PunchInDTO>>(punchIns));
                }
                else if (userRole == "Admin")
                {
                    var adminId = int.Parse(userId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    
                    if (admin == null)
                        return Forbid();

                    var employee = await _context.Employees
                        .FirstOrDefaultAsync(e => e.EmployeeId == employeeId && e.CompanyId == admin.CompanyId);

                    if (employee == null)
                        return Forbid();

                    var punchIns = await _context.PunchIns
                        .Where(p => p.EmployeeId == employeeId)
                        .ToListAsync();

                    return Ok(_mapper.Map<IEnumerable<PunchInDTO>>(punchIns));
                }
                else if (userRole == "Employee")
                {
                    if (userId != employeeId)
                        return Forbid();

                    var punchIns = await _context.PunchIns
                        .Where(p => p.EmployeeId == employeeId)
                        .ToListAsync();

                    return Ok(_mapper.Map<IEnumerable<PunchInDTO>>(punchIns));
                }

                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting punch-ins for employee {EmployeeId}", employeeId);
                return StatusCode((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.");
            }
        }

        // POST: api/PunchIn
        [HttpPost]
        public async Task<ActionResult<PunchInDTO>> CreatePunchIn(CreatePunchInDTO punchInDTO)
        {
            try
            {
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // Validate employee exists
                var employeeRecord = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == punchInDTO.EmployeeId);
                if (employeeRecord == null)
                    return BadRequest("Employee not found.");

                // Check authorization
                if (userRole == "Employee" && userId != punchInDTO.EmployeeId)
                    return Forbid();
                else if (userRole == "Admin")
                {
                    var adminId = int.Parse(userId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    
                    if (admin == null || admin.CompanyId != employeeRecord.CompanyId)
                        return Forbid();
                }

                var punchIn = _mapper.Map<PunchIn>(punchInDTO);
                punchIn.PunchCreatedAt = DateTime.Now;
                punchIn.PunchUpdatedAt = DateTime.Now;

                _context.PunchIns.Add(punchIn);
                await _context.SaveChangesAsync();

                // Create audit log
                var auditLog = new AuditLog
                {
                    Action = AuditAction.insert,
                    TableName = "PunchIn",
                    RecordId = punchIn.PunchId.ToString(),
                    NewData = Newtonsoft.Json.JsonConvert.SerializeObject(punchIn),
                    ActionTimestamp = DateTime.Now,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };

                if (userRole == "Admin")
                    auditLog.AdminId = int.Parse(userId);
                else if (userRole == "SuperAdmin")
                    auditLog.SuperadminId = int.Parse(userId);

                auditLog.CompanyId = employeeRecord.CompanyId;

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetPunchIn), new { id = punchIn.PunchId }, _mapper.Map<PunchInDTO>(punchIn));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating punch-in");
                return StatusCode((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.");
            }
        }

        // PUT: api/PunchIn/5
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<IActionResult> UpdatePunchIn(int id, UpdatePunchInDTO punchInDTO)
        {
            try
            {
                var punchIn = await _context.PunchIns.FindAsync(id);
                if (punchIn == null)
                    return NotFound();

                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // Check authorization
                if (userRole == "Admin")
                {
                    var adminId = int.Parse(userId);
                    var admin = await _context.Admins.FindAsync(adminId);
                    
                    if (admin == null)
                        return Forbid();

                    var employeeRecord = await _context.Employees
                        .FirstOrDefaultAsync(e => e.EmployeeId == punchIn.EmployeeId && e.CompanyId == admin.CompanyId);

                    if (employeeRecord == null)
                        return Forbid();
                }

                // Store old data for audit log
                var oldData = Newtonsoft.Json.JsonConvert.SerializeObject(punchIn);

                // Update properties
                punchIn.PunchFaceUrl = punchInDTO.PunchFaceUrl;
                punchIn.PunchFaceId = punchInDTO.PunchFaceId;
                punchIn.PunchLocationLong = punchInDTO.PunchLocationLong;
                punchIn.PunchLocationLat = punchInDTO.PunchLocationLat;
                punchIn.PunchUpdatedAt = DateTime.Now;

                _context.Entry(punchIn).State = EntityState.Modified;

                // Create audit log
                var auditLog = new AuditLog
                {
                    Action = AuditAction.update,
                    TableName = "PunchIn",
                    RecordId = punchIn.PunchId.ToString(),
                    OldData = oldData,
                    NewData = Newtonsoft.Json.JsonConvert.SerializeObject(punchIn),
                    ActionTimestamp = DateTime.Now,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };

                if (userRole == "Admin")
                    auditLog.AdminId = int.Parse(userId);
                else if (userRole == "SuperAdmin")
                    auditLog.SuperadminId = int.Parse(userId);

                var employeeForAudit = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == punchIn.EmployeeId);
                if (employeeForAudit != null)
                    auditLog.CompanyId = employeeForAudit.CompanyId;

                _context.AuditLogs.Add(auditLog);

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating punch-in with ID {Id}", id);
                return StatusCode((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.");
            }
        }

        // DELETE: api/PunchIn/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeletePunchIn(int id)
        {
            try
            {
                var punchIn = await _context.PunchIns.FindAsync(id);
                if (punchIn == null)
                    return NotFound();

                // Check if there are related session times
                var hasRelatedSessions = await _context.SessionTimes.AnyAsync(s => s.PunchId == id);
                if (hasRelatedSessions)
                    return BadRequest("Cannot delete punch-in with related session times.");

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // Store data for audit log
                var oldData = Newtonsoft.Json.JsonConvert.SerializeObject(punchIn);

                _context.PunchIns.Remove(punchIn);

                // Create audit log
                var auditLog = new AuditLog
                {
                    Action = AuditAction.delete,
                    TableName = "PunchIn",
                    RecordId = punchIn.PunchId.ToString(),
                    OldData = oldData,
                    ActionTimestamp = DateTime.Now,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    SuperadminId = int.Parse(userId)
                };

                var employeeForAudit = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == punchIn.EmployeeId);
                if (employeeForAudit != null)
                    auditLog.CompanyId = employeeForAudit.CompanyId;

                _context.AuditLogs.Add(auditLog);

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting punch-in with ID {Id}", id);
                return StatusCode((int)HttpStatusCode.InternalServerError, "An error occurred while processing your request.");
            }
        }

        private bool PunchInExists(int id)
        {
            return _context.PunchIns.Any(e => e.PunchId == id);
        }
    }
}