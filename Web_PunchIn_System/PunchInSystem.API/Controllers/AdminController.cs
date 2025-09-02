using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;
using System.Security.Claims;

namespace PunchInSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin,Admin")] // Default authorization for all endpoints
    public class AdminController : ControllerBase
    {
        private readonly PunchIn_System_DbContext _context;

        public AdminController(PunchIn_System_DbContext context)
        {
            _context = context;
        }

        // GET: api/Admin
        [HttpGet]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<IEnumerable<AdminDTO>>> GetAdmins()
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // For SuperAdmin, get all admins (including deleted ones)
            if (currentUserRole == "SuperAdmin")
            {
                return await _context.Admins
                    .Select(a => new AdminDTO
                    {
                        AdminId = a.AdminId,
                        CompanyId = a.CompanyId,
                        AdminFirstName = a.AdminFirstName,
                        AdminMiddleName = a.AdminMiddleName,
                        AdminLastName = a.AdminLastName,
                        AdminEmail = a.AdminEmail,
                        AdminPhone = a.AdminPhone,
                        AdminDob = a.AdminDob,
                        IsActive = a.IsActive,
                        AdminCreatedAt = a.AdminCreatedAt,
                        AdminCreatedById = a.AdminCreatedById,
                        AdminUpdatedAt = a.AdminUpdatedAt,
                        AdminUpdatedById = a.AdminUpdatedById,
                        AdminDeletedAt = a.AdminDeletedAt,
                        AdminIsDeleted = a.AdminIsDeleted
                    })
                    .ToListAsync();
            }
            
            // For regular Admin, get only non-deleted admins from their company
            if (currentUserRole == "Admin" && int.TryParse(currentUserId, out int adminId))
            {
                var currentAdmin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.AdminId == adminId && a.AdminIsDeleted == false);

                if (currentAdmin == null)
                    return Forbid();

                return await _context.Admins
                    .Where(a => a.AdminIsDeleted == false && a.CompanyId == currentAdmin.CompanyId)
                    .Select(a => new AdminDTO
                    {
                        AdminId = a.AdminId,
                        CompanyId = a.CompanyId,
                        AdminFirstName = a.AdminFirstName,
                        AdminMiddleName = a.AdminMiddleName,
                        AdminLastName = a.AdminLastName,
                        AdminEmail = a.AdminEmail,
                        AdminPhone = a.AdminPhone,
                        AdminDob = a.AdminDob,
                        IsActive = a.IsActive,
                        AdminCreatedAt = a.AdminCreatedAt,
                        AdminCreatedById = a.AdminCreatedById,
                        AdminUpdatedAt = a.AdminUpdatedAt,
                        AdminUpdatedById = a.AdminUpdatedById,
                        AdminDeletedAt = a.AdminDeletedAt,
                        AdminIsDeleted = a.AdminIsDeleted
                    })
                    .ToListAsync();
            }

            return Forbid();
        }
        // GET: api/Admin/5
        [HttpGet("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<AdminDTO>> GetAdmin(int id)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            var admin = await _context.Admins.FindAsync(id);

            if (admin == null)
            {
                return NotFound("Admin not found.");
            }
            if(admin.AdminIsDeleted == true)
            {
                return NotFound("Admin not found.");
            }

            // If user is Admin (not SuperAdmin), check if they're trying to access an admin from their own company
            if (currentUserRole == "Admin")
            {
                var currentAdmin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.AdminId == int.Parse(currentUserId));
                
                if (currentAdmin == null || admin.CompanyId != currentAdmin.CompanyId)
                {
                    return Forbid();
                }
            }

            return new AdminDTO
            {
                AdminId = admin.AdminId,
                CompanyId = admin.CompanyId,
                AdminFirstName = admin.AdminFirstName,
                AdminMiddleName = admin.AdminMiddleName,
                AdminLastName = admin.AdminLastName,
                AdminEmail = admin.AdminEmail,
                AdminPhone = admin.AdminPhone,
                AdminDob = admin.AdminDob,
                IsActive = admin.IsActive,
                AdminCreatedAt = admin.AdminCreatedAt,
                AdminCreatedById = admin.AdminCreatedById,
                AdminUpdatedAt = admin.AdminUpdatedAt,
                AdminUpdatedById = admin.AdminUpdatedById,
                AdminDeletedAt = admin.AdminDeletedAt,
                AdminIsDeleted = admin.AdminIsDeleted
            };
        }

        // POST: api/Admin
        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin")] // Both SuperAdmin and Admin can create admins
        public async Task<ActionResult<AdminDTO>> CreateAdmin(CreateAdminDTO adminDTO)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized("Unable to identify current user.");
            }

            // Check if email already exists
            if (await _context.Admins.AnyAsync(a => a.AdminEmail == adminDTO.AdminEmail))
            {
                return BadRequest("Email already exists.");
            }

            // Get current admin's company if not SuperAdmin
            int? currentAdminCompanyId = null;
            if (currentUserRole == "Admin")
            {
                var currentAdmin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.AdminId == int.Parse(currentUserId));
                
                if (currentAdmin == null || currentAdmin.AdminIsDeleted == true)
                {
                    return Unauthorized("Invalid admin account.");
                }
                currentAdminCompanyId = currentAdmin.CompanyId;
            }

            // Verify the company exists and check permissions
            var company = await _context.Companies.FindAsync(adminDTO.CompanyId);
            if (company == null || company.CompanyIsDeleted == true)
            {
                return BadRequest("Invalid company ID.");
            }

            // If current user is Admin, ensure they're only creating admins in their own company
            if (currentUserRole == "Admin" && adminDTO.CompanyId != currentAdminCompanyId)
            {
                return Forbid("You can only create admins for your own company.");
            }

            var admin = new Admin
            {
                CompanyId = adminDTO.CompanyId,
                AdminFirstName = adminDTO.AdminFirstName,
                AdminMiddleName = adminDTO.AdminMiddleName,
                AdminLastName = adminDTO.AdminLastName,
                AdminEmail = adminDTO.AdminEmail,
                AdminPhone = adminDTO.AdminPhone,
                AdminDob = adminDTO.AdminDob,
                AdminPassword = BCrypt.Net.BCrypt.HashPassword(adminDTO.AdminPassword),
                AdminCreatedAt = DateTime.UtcNow,
                IsActive = true,
                AdminIsDeleted = false
            };

            // Set the created by fields based on the current user's role
            if (currentUserRole == "SuperAdmin")
            {
                admin.AdminCreatedBySuperadminId = int.Parse(currentUserId);
            }
            else
            {
                admin.AdminCreatedById = int.Parse(currentUserId);
            }

            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();
            // Create audit log entry
            var auditLog = new AuditLog
            {
                AdminId = currentUserRole == "Admin" ? int.Parse(currentUserId) : (int?)null,
                SuperadminId = currentUserRole == "SuperAdmin" ? int.Parse(currentUserId) : (int?)null,
                CompanyId = admin.CompanyId,
                Action = AuditAction.insert,
                TableName = "Admin",
                RecordId = admin.AdminId.ToString(),
                NewData = SafeSerializeAuditLog(new
                {
                    Message = "New admin created",
                    CreatedAdmin = new
                    {
                        AdminId = admin.AdminId,
                        Email = admin.AdminEmail,
                        FirstName = admin.AdminFirstName,
                        LastName = admin.AdminLastName,
                        Phone = admin.AdminPhone,
                        CompanyId = admin.CompanyId
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


            return CreatedAtAction(nameof(GetAdmin), new { id = admin.AdminId }, new AdminDTO
            {
                AdminId = admin.AdminId,
                CompanyId = admin.CompanyId,
                AdminFirstName = admin.AdminFirstName,
                AdminMiddleName = admin.AdminMiddleName,
                AdminLastName = admin.AdminLastName,
                AdminEmail = admin.AdminEmail,
                AdminPhone = admin.AdminPhone,
                AdminDob = admin.AdminDob,
                IsActive = admin.IsActive,
                AdminCreatedAt = admin.AdminCreatedAt,
                AdminCreatedById = admin.AdminCreatedById
            });
        }

        // PUT: api/Admin/5
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<IActionResult> UpdateAdmin(int id, UpdateAdminDTO adminDTO)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var isSuperAdmin = User.IsInRole("SuperAdmin");

            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized("Unable to identify current user.");
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var admin = await _context.Admins
                        .Include(a => a.Company)
                        .FirstOrDefaultAsync(a => a.AdminId == id);

                    if (admin == null || admin.AdminIsDeleted == true)
                    {
                        return NotFound("Admin not found.");
                    }

                    // Regular admins can only update admins in their own company
                    if (!isSuperAdmin)
                    {
                        var currentAdmin = await _context.Admins
                            .FirstOrDefaultAsync(a => a.AdminId == int.Parse(currentUserId));

                        if (currentAdmin == null || currentAdmin.AdminIsDeleted == true)
                        {
                            return Unauthorized("Invalid admin account.");
                        }

                        if (admin.CompanyId != currentAdmin.CompanyId)
                        {
                            return Forbid("You can only update admins from your own company.");
                        }
                    }

                    // Save old values for audit log
                    var oldValues = new
                    {
                        admin.AdminFirstName,
                        admin.AdminMiddleName,
                        admin.AdminLastName,
                        admin.AdminEmail,
                        admin.AdminPhone,
                        admin.AdminDob,
                        admin.IsActive,
                        admin.CompanyId
                    };

                    // Update admin properties
                    admin.AdminFirstName = adminDTO.AdminFirstName ?? admin.AdminFirstName;
                    admin.AdminMiddleName = adminDTO.AdminMiddleName ?? admin.AdminMiddleName;
                    admin.AdminLastName = adminDTO.AdminLastName ?? admin.AdminLastName;
                    admin.AdminEmail = adminDTO.AdminEmail ?? admin.AdminEmail;
                    admin.AdminPhone = adminDTO.AdminPhone ?? admin.AdminPhone;
                    admin.AdminDob = adminDTO.AdminDob ?? admin.AdminDob;
                    admin.IsActive = adminDTO.IsActive ?? admin.IsActive;
                    admin.AdminUpdatedAt = DateTime.UtcNow;

                    // Only SuperAdmin can change company
                    if (isSuperAdmin && adminDTO.CompanyId != 0)
                    {
                        admin.CompanyId = adminDTO.CompanyId;
                        admin.AdminUpdatedBySuperadminId = int.Parse(currentUserId);
                        admin.AdminUpdatedById = null;
                    }
                    else
                    {
                        admin.AdminUpdatedById = int.Parse(currentUserId);
                        admin.AdminUpdatedBySuperadminId = null;
                    }

                    _context.Entry(admin).State = EntityState.Modified;

                    // Create audit log
                    var auditLog = new AuditLog
                    {
                        AdminId = isSuperAdmin ? null : int.Parse(currentUserId),
                        SuperadminId = isSuperAdmin ? int.Parse(currentUserId) : null,
                        CompanyId = admin.CompanyId,
                        Action = AuditAction.update,
                        TableName = "Admin",
                        RecordId = admin.AdminId.ToString(),
                        OldData = SafeSerializeAuditLog(oldValues),
                        NewData = SafeSerializeAuditLog(new
                        {
                            admin.AdminFirstName,
                            admin.AdminMiddleName,
                            admin.AdminLastName,
                            admin.AdminEmail,
                            admin.AdminPhone,
                            admin.AdminDob,
                            admin.IsActive,
                            admin.CompanyId,
                            UpdatedBy = isSuperAdmin ? "SuperAdmin" : "Admin",
                            UpdatedById = int.Parse(currentUserId),
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
                    return StatusCode(500, new { message = "An error occurred while updating the admin.", error = ex.Message });
                }
            }
        }

        // DELETE: api/Admin/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<IActionResult> DeleteAdmin(int id)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var isSuperAdmin = User.IsInRole("SuperAdmin");

            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized("Unable to identify current user.");
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var admin = await _context.Admins
                        .Include(a => a.Company)
                        .FirstOrDefaultAsync(a => a.AdminId == id);

                    if (admin == null || admin.AdminIsDeleted == true)
                    {
                        return NotFound("Admin not found.");
                    }

                    // Prevent deleting yourself
                    if (id == int.Parse(currentUserId))
                    {
                        return BadRequest("You cannot delete your own account.");
                    }

                    // Regular admins can only delete admins in their own company
                    if (!isSuperAdmin)
                    {
                        var currentAdmin = await _context.Admins
                            .FirstOrDefaultAsync(a => a.AdminId == int.Parse(currentUserId));

                        if (currentAdmin == null || currentAdmin.AdminIsDeleted == true)
                        {
                            return Unauthorized("Invalid admin account.");
                        }

                        if (admin.CompanyId != currentAdmin.CompanyId)
                        {
                            return Forbid("You can only delete admins from your own company.");
                        }
                    }

                    // Check if trying to delete a SuperAdmin
                    var isTargetSuperAdmin = await _context.SuperAdmins.AnyAsync(sa => sa.SuperadminEmail == admin.AdminEmail);
                    if (isTargetSuperAdmin)
                    {
                        return Forbid("Cannot delete SuperAdmin through this endpoint.");
                    }

                    // Save old values for audit log
                    var oldValues = new
                    {
                        admin.AdminFirstName,
                        admin.AdminLastName,
                        admin.AdminEmail,
                        admin.CompanyId,
                        admin.IsActive,
                        admin.AdminIsDeleted
                    };

                    // Soft delete the admin
                    admin.AdminIsDeleted = true;
                    admin.IsActive = false;
                    admin.AdminDeletedAt = DateTime.UtcNow;

                    // Set deleted by fields based on role
                    if (isSuperAdmin)
                    {
                        admin.AdminDeletedBySuperadminId = int.Parse(currentUserId);
                        admin.AdminDeletedById = null;
                    }
                    else
                    {
                        admin.AdminDeletedById = int.Parse(currentUserId);
                        admin.AdminDeletedBySuperadminId = null;
                    }

                    _context.Entry(admin).State = EntityState.Modified;

                    // Create audit log
                    var auditLog = new AuditLog
                    {
                        AdminId = isSuperAdmin ? null : int.Parse(currentUserId),
                        SuperadminId = isSuperAdmin ? int.Parse(currentUserId) : null,
                        CompanyId = admin.CompanyId,
                        Action = AuditAction.delete,
                        TableName = "Admin",
                        RecordId = admin.AdminId.ToString(),
                        OldData = SafeSerializeAuditLog(oldValues),
                        NewData = SafeSerializeAuditLog(new
                        {
                            admin.AdminIsDeleted,
                            admin.IsActive,
                            DeletedBy = isSuperAdmin ? "SuperAdmin" : "Admin",
                            DeletedById = int.Parse(currentUserId),
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
                    return StatusCode(500, new { message = "An error occurred while deleting the admin.", error = ex.Message });
                }
            }
        }

        private bool AdminExists(int id)
        {
            return _context.Admins.Any(e => e.AdminId == id);
        }
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
}
