using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;
using Newtonsoft.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace PunchInSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class DesignationController : ControllerBase
{
    private readonly PunchIn_System_DbContext _context;
    private readonly IMapper _mapper;

    public DesignationController(PunchIn_System_DbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DesignationDto>>> GetDesignations()
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var currentAdminCompanyId = 0;

        IQueryable<Designation> query = _context.Designations.Where(d => d.DesignationIsDeleted != true);

        // If user is Admin, filter by their company
        if (currentUserRole == "Admin" && int.TryParse(currentUserId, out int adminId))
        {
            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.AdminId == adminId && a.AdminIsDeleted != true);

            if (admin == null)
                return Forbid();

            currentAdminCompanyId = admin.CompanyId;
            query = query.Where(d => d.CompanyId == currentAdminCompanyId);
        }

        var designations = await query.ToListAsync();
        return Ok(_mapper.Map<IEnumerable<DesignationDto>>(designations));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DesignationDto>> GetDesignation(int id)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var designation = await _context.Designations
            .FirstOrDefaultAsync(d => d.DesignationId == id && d.DesignationIsDeleted == false);

        if (designation == null)
            return NotFound("Designation not found");

        // If user is Admin, verify they are accessing their own company's designation
        if (currentUserRole == "Admin" && int.TryParse(currentUserId, out int adminId))
        {
            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.AdminId == adminId && a.AdminIsDeleted != true);

            if (admin == null || admin.CompanyId != designation.CompanyId)
                return Forbid("You can only access designations in your company");
        }

        return Ok(_mapper.Map<DesignationDto>(designation));
    }

    [HttpPost]
    public async Task<ActionResult<DesignationDto>> CreateDesignation(CreateDesignationDto dto)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(currentUserId))
                    return Unauthorized("Unable to identify current user.");

                // For SuperAdmin, use the provided companyId from DTO
                if (currentUserRole == "SuperAdmin")
                {
                    if (dto.CompanyId <= 0)
                        return BadRequest("Company ID is required for SuperAdmin");
                    
                    // Verify company exists and is not deleted
                    var companyExists = await _context.Companies
                        .AnyAsync(c => c.CompanyId == dto.CompanyId && c.CompanyIsDeleted != true);
                        
                    if (!companyExists)
                        return BadRequest("Invalid Company ID");
                }
                // For Admin, use their own company ID
                else if (currentUserRole == "Admin")
                {
                    if (!int.TryParse(currentUserId, out int adminId))
                        return BadRequest("Invalid user ID");

                    var admin = await _context.Admins
                        .FirstOrDefaultAsync(a => a.AdminId == adminId && a.AdminIsDeleted != true);

                    if (admin == null)
                        return Forbid("Admin not found or inactive");
                        
                    dto.CompanyId = admin.CompanyId; // Set company ID from admin
                }
                else
                {
                    return Forbid("Insufficient permissions");
                }

                // Map DTO to entity
                var designation = _mapper.Map<Designation>(dto);
                designation.DesignationCreatedAt = DateTime.UtcNow;
                _context.Designations.Add(designation);
                await _context.SaveChangesAsync();

                //Log designation creation
               var auditLog = new AuditLog
               {
                   AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : (int?)null,
                   SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : (int?)null,
                   CompanyId = designation.CompanyId,
                   Action = AuditAction.insert,
                   TableName = "Designation",
                   RecordId = designation.DesignationId.ToString(),
                   NewData = SafeSerializeAuditLog(new
                   {
                       Message = "New designation created",
                       CreatedDesignation = new
                       {
                           DesignationId = designation.DesignationId,
                           DesignationName = designation.DesignationName,
                           DesignationDescription = designation.DesignationDescription,
                           CompanyId = designation.CompanyId
                       },
                       CreatedBy = currentUserId,
                       CreatedByRole = currentUserRole,
                       CreatedAt = DateTime.UtcNow
                   }),
                   ActionTimestamp = DateTime.UtcNow,
                   IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
               };
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return CreatedAtAction(nameof(GetDesignation), new { id = designation.DesignationId }, _mapper.Map<DesignationDto>(designation));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDesignation(int id, UpdateDesignationDto dto)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(currentUserId))
                    return Unauthorized("Unable to identify current user.");

                var designation = await _context.Designations
                    .FirstOrDefaultAsync(d => d.DesignationId == id && d.DesignationIsDeleted != true);

                if (designation == null)
                    return NotFound("Designation not found");

                // If user is Admin, verify they are updating their own company's designation
                if (currentUserRole == "Admin" && int.TryParse(currentUserId, out int adminId))
                {
                    var admin = await _context.Admins
                        .FirstOrDefaultAsync(a => a.AdminId == adminId && a.AdminIsDeleted != true);

                    if (admin == null || admin.CompanyId != designation.CompanyId)
                        return Forbid("You can only update designations in your company");
                }

                // Store old data for audit log
                var oldData = new
                {
                    DesignationId = designation.DesignationId,
                    DesignationName = designation.DesignationName,
                    DesignationDescription = designation.DesignationDescription,
                    CompanyId = designation.CompanyId
                };

                _mapper.Map(dto, designation);
                await _context.SaveChangesAsync();

                // Log designation update
                var auditLog = new AuditLog
                {
                    AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : (int?)null,
                    SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : (int?)null,
                    CompanyId = designation.CompanyId,
                    Action = AuditAction.update,
                    TableName = "Designation",
                    RecordId = id.ToString(),
                    OldData = SafeSerializeAuditLog(oldData),
                    NewData = SafeSerializeAuditLog(new
                    {
                        Message = "Designation updated",
                        UpdatedDesignation = new
                        {
                            DesignationId = designation.DesignationId,
                            DesignationName = designation.DesignationName,
                            DesignationDescription = designation.DesignationDescription,
                            CompanyId = designation.CompanyId
                        },
                        UpdatedBy = currentUserId,
                        UpdatedByRole = currentUserRole,
                        UpdatedAt = DateTime.UtcNow
                    }),
                    ActionTimestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> DeleteDesignation(int id)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(currentUserId))
                    return Unauthorized("Unable to identify current user.");

                var designation = await _context.Designations
                    .FirstOrDefaultAsync(d => d.DesignationId == id && d.DesignationIsDeleted != true);

                if (designation == null)
                    return NotFound("Designation not found");

                // If user is Admin, verify they are deleting their own company's designation
                if (currentUserRole == "Admin" && int.TryParse(currentUserId, out int adminId))
                {
                    var admin = await _context.Admins
                        .FirstOrDefaultAsync(a => a.AdminId == adminId && a.AdminIsDeleted != true);

                    if (admin == null || admin.CompanyId != designation.CompanyId)
                        return Forbid("You can only delete designations in your company");
                }

                // Store old data for audit log
                var oldData = new
                {
                    DesignationId = designation.DesignationId,
                    DesignationName = designation.DesignationName,
                    DesignationDescription = designation.DesignationDescription,
                    CompanyId = designation.CompanyId,
                    IsDeleted = designation.DesignationIsDeleted
                };

                // Soft delete the designation
                designation.DesignationIsDeleted = true;
                designation.DesignationDeletedAt = DateTime.UtcNow;
                
                // Set deleted by field based on role
                if (currentUserRole == "SuperAdmin")
                    designation.DesignationDeletedBySuperadminId = int.Parse(currentUserId);
                else
                    designation.DesignationDeletedById = int.Parse(currentUserId);
                    
                await _context.SaveChangesAsync();

                //Log designation deletion
               var auditLog = new AuditLog
               {
                   AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : (int?)null,
                   SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : (int?)null,
                   CompanyId = designation.CompanyId,
                   Action = AuditAction.delete,
                   TableName = "Designation",
                   RecordId = id.ToString(),
                   OldData = SafeSerializeAuditLog(oldData),
                   ActionTimestamp = DateTime.UtcNow,
                   IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
               };
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    // Helper: Always produce valid JSON object for audit log
    private static string SafeSerializeAuditLog(object obj)
    {
        try
        {
            var json = JsonConvert.SerializeObject(obj);
            // Validate: must be a JSON object or array, not null/empty/whitespace
            if (string.IsNullOrWhiteSpace(json) || json == "null" || !json.TrimStart().StartsWith("{") && !json.TrimStart().StartsWith("["))
            {
                Console.WriteLine("[ERROR] AuditLog.NewData serialization produced invalid JSON, using fallback '{}'");
                return "{}";
            }
            return json;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Exception during AuditLog.NewData serialization: {ex.Message}");
            return "{}";
        }
    }
}
