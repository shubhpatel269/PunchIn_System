using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;
using Newtonsoft.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using System.Data;

namespace PunchInSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompanyController : ControllerBase
{
    private readonly PunchIn_System_DbContext _context;
    private readonly IMapper _mapper;

    public CompanyController(PunchIn_System_DbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<IEnumerable<CompanyDto>>> GetCompanies()
    {
        var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var currentAdminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

        if (currentUserRole == "SuperAdmin")
        {
            var companies = await _context.Companies.ToListAsync();
            return Ok(_mapper.Map<IEnumerable<CompanyDto>>(companies));
        }
        
        // For Admin, return only their company
        var admin = await _context.Admins
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.AdminId == currentAdminId);

        if (admin?.Company == null)
            return NotFound("Company not found for the current admin.");

        return Ok(new List<CompanyDto> { _mapper.Map<CompanyDto>(admin.Company) });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<CompanyDto>> GetCompany(int id)
    {
        var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var currentAdminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

        // Super Admin can access any company
        if (currentUserRole == "SuperAdmin")
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound();
            return Ok(_mapper.Map<CompanyDto>(company));
        }

        // Admin can only access their own company
        var admin = await _context.Admins
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.AdminId == currentAdminId);

        if (admin?.Company == null || admin.Company.CompanyId != id)
            return Forbid("You don't have permission to access this company.");

        return Ok(_mapper.Map<CompanyDto>(admin.Company));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<CompanyDto>> CreateCompany(CreateCompanyDto dto)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // Get the current admin ID from JWT token
                var currentAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentAdminId))
                    return Unauthorized("Unable to identify current admin.");

                var company = new Company
                {
                    CompanyName = dto.CompanyName,
                    ContactNo = dto.ContactNo,
                    CompanyEmail = dto.CompanyEmail,
                    CompanyType = dto.CompanyType,
                    CompanyAddress = dto.CompanyAddress,
                    CompanyCity = dto.CompanyCity,
                    CompanyState = dto.CompanyState,
                    CompanyCreatedAt = DateTime.UtcNow,
                    CompanyCreatedBySuperadminId = int.Parse(currentAdminId),
                };
                _context.Companies.Add(company);
                await _context.SaveChangesAsync();

                // Log company creation
                var auditLog = new AuditLog
                {
                    AdminId = null,
                    SuperadminId = int.Parse(currentAdminId),
                    CompanyId = company.CompanyId,
                    Action = AuditAction.insert,
                    TableName = "Company",
                    RecordId = company.CompanyId.ToString(),
                    NewData = SafeSerializeAuditLog(new
                    {
                        Message = "New company created",
                        CreatedCompany = new
                        {
                            CompanyId = company.CompanyId,
                            CompanyName = company.CompanyName,
                            ContactNo = company.ContactNo,
                            CompanyEmail = company.CompanyEmail,
                            CompanyType = company.CompanyType,
                            CompanyAddress = company.CompanyAddress,
                            CompanyCity = company.CompanyCity,
                            CompanyState = company.CompanyState
                        },
                        CreatedBy = currentAdminId,
                        CreatedAt = DateTime.UtcNow
                    }),
                    ActionTimestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return CreatedAtAction(nameof(GetCompany), new { id = company.CompanyId }, _mapper.Map<CompanyDto>(company));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateCompany(int id, UpdateCompanyDto dto)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // Get the current user's role and ID from JWT token
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var currentAdminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                var company = await _context.Companies.FindAsync(id);
                if (company == null) return NotFound("Company not found.");

                // For Admin, verify they can only update their own company
                if (currentUserRole == "Admin")
                {
                    var admin = await _context.Admins
                        .FirstOrDefaultAsync(a => a.AdminId == currentAdminId && a.CompanyId == id);
                    
                    if (admin == null)
                        return Forbid("You don't have permission to update this company.");
                }

                // Store old data for audit log
                var oldData = new
                {
                    CompanyId = company.CompanyId,
                    CompanyName = company.CompanyName,
                    ContactNo = company.ContactNo,
                    CompanyEmail = company.CompanyEmail,
                    CompanyType = company.CompanyType,
                    CompanyAddress = company.CompanyAddress,
                    CompanyCity = company.CompanyCity,
                    CompanyState = company.CompanyState
                };

                _mapper.Map(dto, company);
                await _context.SaveChangesAsync();

                // Log company update
                var auditLog = new AuditLog
                {
                    AdminId = currentUserRole == "Admin" ? currentAdminId : (int?)null,
                    SuperadminId = currentUserRole == "SuperAdmin" ?currentAdminId : (int?)null,
                    CompanyId = company.CompanyId,
                    Action = AuditAction.update,
                    TableName = "Company",
                    RecordId = id.ToString(),
                    OldData = SafeSerializeAuditLog(oldData),
                    NewData = SafeSerializeAuditLog(new
                    {
                        Message = "Company updated",
                        UpdatedCompany = new
                        {
                            CompanyId = company.CompanyId,
                            CompanyName = company.CompanyName,
                            ContactNo = company.ContactNo,
                            CompanyEmail = company.CompanyEmail,
                            CompanyType = company.CompanyType,
                            CompanyAddress = company.CompanyAddress,
                            CompanyCity = company.CompanyCity,
                            CompanyState = company.CompanyState
                        },
                        UpdatedBy = currentAdminId,
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
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // Get the current SuperAdmin ID from JWT token
                var currentSuperAdminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                var company = await _context.Companies.FindAsync(id);
                if (company == null) return NotFound("Company not found.");

                // Store old data for audit log
                var oldData = new
                {
                    CompanyId = company.CompanyId,
                    CompanyName = company.CompanyName,
                    ContactNo = company.ContactNo,
                    CompanyEmail = company.CompanyEmail,
                    CompanyType = company.CompanyType,
                    CompanyAddress = company.CompanyAddress,
                    CompanyCity = company.CompanyCity,
                    CompanyState = company.CompanyState,
                    IsDeleted = company.CompanyIsDeleted
                };

                company.CompanyIsDeleted = true;
                company.CompanyDeletedAt = DateTime.UtcNow;
                company.CompanyDeletedBySuperadminId = currentSuperAdminId;
                await _context.SaveChangesAsync();

                // Log company deletion
                var auditLog = new AuditLog
                {
                    AdminId = null,
                    SuperadminId = currentSuperAdminId,
                    CompanyId = company.CompanyId,
                    Action = AuditAction.delete,
                    TableName = "Company",
                    RecordId = id.ToString(),
                    OldData = SafeSerializeAuditLog(oldData),
                    NewData = SafeSerializeAuditLog(new
                    {
                        Message = "Company deleted (soft delete)",
                        DeletedCompany = new
                        {
                            CompanyId = company.CompanyId,
                            CompanyName = company.CompanyName,
                            CompanyEmail = company.CompanyEmail
                        },
                        DeletedBy = currentSuperAdminId,
                        DeletedAt = DateTime.UtcNow
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
