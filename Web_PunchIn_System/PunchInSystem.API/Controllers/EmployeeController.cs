using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Newtonsoft.Json;

namespace PunchInSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin")] // Default authorization for all endpoints
public class EmployeeController : ControllerBase
{
    private readonly PunchIn_System_DbContext _context;
    private readonly ILogger<EmployeeController> _logger;

    public EmployeeController(PunchIn_System_DbContext context, ILogger<EmployeeController> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    private string SafeSerializeAuditLog(object data)
    {
        try
        {
            return JsonConvert.SerializeObject(data);
        }
        catch
        {
            return "Unable to serialize data for audit log";
        }
    }

    // GET: api/Employee
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeDTO>>> GetEmployees()
    {
        try
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Query base
            var query = _context.Employees.Where(e => (bool)!e.EmployeeIsDeleted);

            // If Admin, only show employees from their company
            if (currentUserRole == "Admin")
            {
                // Get admin's company ID
                var adminId = int.Parse(currentUserId);
                var admin = await _context.Admins.FindAsync(adminId);
                if (admin == null)
                {
                    return Forbid();
                }

                // Filter by company ID
                query = query.Where(e => e.CompanyId == admin.CompanyId);
            }

            var employees = await query
                .Select(e => MapToDTO(e))
                .ToListAsync();

            return Ok(employees);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting employees");
            return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving employees");
        }
    }

    // GET: api/Employee/5
    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeeDTO>> GetEmployee(string id)
    {
        try
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == id && e.EmployeeIsDeleted == false);

            if (employee == null)
            {
                return NotFound();
            }

            // If Admin, verify they belong to the same company as the employee
            if (currentUserRole == "Admin")
            {
                var adminId = int.Parse(currentUserId);
                if (!await AdminHasAccessToCompany(adminId, employee.CompanyId))
                {
                    return Forbid();
                }
            }

            return Ok(MapToDTO(employee));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting employee with ID: {id}");
            return StatusCode((int)HttpStatusCode.InternalServerError, "Error retrieving employee");
        }
    }

    // POST: api/Employee
    [HttpPost]
    public async Task<ActionResult<EmployeeDTO>> CreateEmployee(CreateEmployeeDTO employeeDTO)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
            int companyId;

            // If Admin, get their company ID or verify they are creating an employee for their own company
            if (currentUserRole == "Admin")
            {
                var adminId = int.Parse(currentUserId);
                var admin = await _context.Admins.FindAsync(adminId);
                
                if (admin == null)
                {
                    return BadRequest("Admin not found.");
                }
                
                // If CompanyId is not provided, use the admin's company
                if (!employeeDTO.CompanyId.HasValue)
                {
                    companyId = admin.CompanyId;
                }
                else
                {
                    companyId = employeeDTO.CompanyId.Value;
                    // Verify admin has access to the specified company
                    if (admin.CompanyId != companyId)
                    {
                        return BadRequest("You can only create employees for your own company.");
                    }
                }
            }
            else if (currentUserRole == "SuperAdmin")
            {
                // SuperAdmin must specify a company ID
                if (!employeeDTO.CompanyId.HasValue)
                {
                    return BadRequest("Company ID is required for SuperAdmin users.");
                }
                companyId = employeeDTO.CompanyId.Value;
            }
            else
            {
                return Forbid();
            }

            // Validate employee ID length if provided
            if (!string.IsNullOrEmpty(employeeDTO.EmployeeId))
            {
                if (employeeDTO.EmployeeId.Length > 30)
                {
                    return BadRequest("Employee ID cannot exceed 30 characters.");
                }
                
                // Check if employee ID already exists
                var existingEmployee = await _context.Employees.FindAsync(employeeDTO.EmployeeId);
                if (existingEmployee != null)
                {
                    return BadRequest("Employee ID already exists. Please use a different ID.");
                }
            }

            var employee = new Employee
            {
                EmployeeId = !string.IsNullOrEmpty(employeeDTO.EmployeeId) 
                    ? employeeDTO.EmployeeId 
                    : Guid.NewGuid().ToString().Substring(0, 30),
                CompanyId = companyId,
                EmployeeDesignationId = employeeDTO.EmployeeDesignationId,
                EmployeeFirstName = employeeDTO.EmployeeFirstName,
                EmployeeMiddleName = employeeDTO.EmployeeMiddleName,
                EmployeeLastName = employeeDTO.EmployeeLastName,
                EmployeeEmail = employeeDTO.EmployeeEmail,
                EmployeeDob = employeeDTO.EmployeeDob,
                EmployeePhone = employeeDTO.EmployeePhone,
                EmployeeFaceImage = employeeDTO.EmployeeFaceImage ?? string.Empty,
                EmployeeFaceId = employeeDTO.EmployeeFaceId ?? string.Empty,
                EmployeeLocationHome = employeeDTO.EmployeeLocationHome ?? string.Empty,
                EmployeeIsActive = employeeDTO.EmployeeIsActive ?? true,
                EmployeeCreatedAt = DateTime.UtcNow,
                EmployeeIsDeleted = false
            };

            // Set creator information based on role
            if (currentUserRole == "Admin")
            {
                employee.EmployeeCreatedById = int.Parse(currentUserId);
            }
            else if (currentUserRole == "SuperAdmin")
            {
                employee.EmployeeCreatedBySuperadminId = int.Parse(currentUserId);
            }

            _context.Employees.Add(employee);
            
            // Create audit log entry
            var auditLog = new AuditLog
            {
                AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : null,
                SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : null,
                CompanyId = employee.CompanyId,
                Action = AuditAction.insert,
                TableName = "Employee",
                RecordId = employee.EmployeeId,
                NewData = SafeSerializeAuditLog(employeeDTO),
                ActionTimestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            };
            
            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployee), new { id = employee.EmployeeId }, MapToDTO(employee));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating employee");
            return StatusCode((int)HttpStatusCode.InternalServerError, "Error creating employee");
        }
    }

    // PUT: api/Employee/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(string id, UpdateEmployeeDTO employeeDTO)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == id && e.EmployeeIsDeleted == false);

            // Employee exists and user has permission to delete it

            // If Admin, verify they belong to the same company as the employee
            if (currentUserRole == "Admin")
            {
                var adminId = int.Parse(currentUserId);
                
                // Ensure the employee belongs to the admin's company
                if (!await AdminHasAccessToCompany(adminId, employee.CompanyId))
                {
                    return Forbid();
                }

                // Ensure the employee is being updated within the admin's company
                if (!await AdminHasAccessToCompany(adminId, employeeDTO.CompanyId))
                {
                    return BadRequest("You cannot change an employee to a different company.");
                }
            }

            if (employee == null)
            {
                return NotFound();
            }

            // Update properties
            employee.CompanyId = employeeDTO.CompanyId;
            employee.EmployeeDesignationId = employeeDTO.EmployeeDesignationId;
            employee.EmployeeFirstName = employeeDTO.EmployeeFirstName;
            employee.EmployeeMiddleName = employeeDTO.EmployeeMiddleName;
            employee.EmployeeLastName = employeeDTO.EmployeeLastName;
            employee.EmployeeEmail = employeeDTO.EmployeeEmail;
            employee.EmployeeDob = employeeDTO.EmployeeDob;
            employee.EmployeePhone = employeeDTO.EmployeePhone;
            
            if (employeeDTO.EmployeeFaceImage != null)
                employee.EmployeeFaceImage = employeeDTO.EmployeeFaceImage;
                
            if (employeeDTO.EmployeeFaceId != null)
                employee.EmployeeFaceId = employeeDTO.EmployeeFaceId;
                
            if (employeeDTO.EmployeeLocationHome != null)
                employee.EmployeeLocationHome = employeeDTO.EmployeeLocationHome;
                
            if (employeeDTO.EmployeeIsActive.HasValue)
                employee.EmployeeIsActive = employeeDTO.EmployeeIsActive.Value;
                
            employee.EmployeeUpdatedAt = DateTime.UtcNow;
            
            // Set updater information based on role
            if (currentUserRole == "Admin")
            {
                employee.EmployeeUpdatedById = int.Parse(currentUserId);
            }
            else if (currentUserRole == "SuperAdmin")
            {
                employee.EmployeeUpdatedBySuperadminId = int.Parse(currentUserId);
            }

            // Create audit log entry
            var auditLog = new AuditLog
            {
                AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : null,
                SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : null,
                CompanyId = employee.CompanyId,
                Action = AuditAction.update,
                TableName = "Employee",
                RecordId = employee.EmployeeId,
                OldData = SafeSerializeAuditLog(await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeId == id)),
                NewData = SafeSerializeAuditLog(employeeDTO),
                ActionTimestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            };
            
            _context.Entry(employee).State = EntityState.Modified;
            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            if (!EmployeeExists(id))
            {
                return NotFound();
            }
            _logger.LogError(ex, $"Concurrency error updating employee with ID: {id}");
            return StatusCode((int)HttpStatusCode.InternalServerError, "Error updating employee");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error updating employee with ID: {id}");
            return StatusCode((int)HttpStatusCode.InternalServerError, "Error updating employee");
        }
    }

    // DELETE: api/Employee/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(string id)
    {
        try
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == id && e.EmployeeIsDeleted == false);

            if (employee == null)
            {
                return NotFound();
            }

            // If Admin, verify they belong to the same company as the employee
            if (currentUserRole == "Admin")
            {
                var adminId = int.Parse(currentUserId);
                if (!await AdminHasAccessToCompany(adminId, employee.CompanyId))
                {
                    return Forbid();
                }
            }

            // Soft delete
            employee.EmployeeIsDeleted = true;
            employee.EmployeeDeletedAt = DateTime.UtcNow;
            
            // Set deleter information based on role
            if (currentUserRole == "Admin")
            {
                employee.EmployeeDeletedById = int.Parse(currentUserId);
            }
            else if (currentUserRole == "SuperAdmin")
            {
                employee.EmployeeDeletedBySuperadminId = int.Parse(currentUserId);
            }
            
            // Create audit log entry
            var auditLog = new AuditLog
            {
                AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : null,
                SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : null,
                CompanyId = employee.CompanyId,
                Action = AuditAction.delete,
                TableName = "Employee",
                RecordId = employee.EmployeeId,
                OldData = SafeSerializeAuditLog(await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeId == id)),
                ActionTimestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            };
            
            _context.Entry(employee).State = EntityState.Modified;
            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error deleting employee with ID: {id}");
            return StatusCode((int)HttpStatusCode.InternalServerError, "Error deleting employee");
        }
    }

    private bool EmployeeExists(string id)
    {
        return _context.Employees.Any(e => e.EmployeeId == id && e.EmployeeIsDeleted == false);
    }

    /// <summary>
    /// Checks if an admin has access to a specific company
    /// </summary>
    /// <param name="adminId">The admin ID</param>
    /// <param name="companyId">The company ID to check access for, can be null</param>
    /// <returns>True if admin has access, false otherwise</returns>
    private async Task<bool> AdminHasAccessToCompany(int adminId, int? companyId)
    {
        var admin = await _context.Admins.FindAsync(adminId);
        
        // If companyId is null, we'll use the admin's company
        if (!companyId.HasValue)
        {
            return admin != null;
        }
        
        return admin != null && admin.CompanyId == companyId.Value;
    }

    private static EmployeeDTO MapToDTO(Employee employee) =>
        new()
        {
            EmployeeId = employee.EmployeeId,
            CompanyId = employee.CompanyId,
            EmployeeDesignationId = employee.EmployeeDesignationId,
            EmployeeFirstName = employee.EmployeeFirstName,
            EmployeeMiddleName = employee.EmployeeMiddleName,
            EmployeeLastName = employee.EmployeeLastName,
            EmployeeEmail = employee.EmployeeEmail,
            EmployeeDob = employee.EmployeeDob,
            EmployeePhone = employee.EmployeePhone,
            EmployeeFaceImage = employee.EmployeeFaceImage,
            EmployeeFaceId = employee.EmployeeFaceId,
            EmployeeLocationHome = employee.EmployeeLocationHome,
            EmployeeIsActive = employee.EmployeeIsActive
        };
}
