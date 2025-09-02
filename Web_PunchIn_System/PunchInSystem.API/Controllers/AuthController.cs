using AutoMapper;
using Azure.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PunchInSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly PunchIn_System_DbContext _context;
    private readonly IConfiguration _config;
    private readonly IMapper _mapper;

    public AuthController(PunchIn_System_DbContext context, IConfiguration config, IMapper mapper)
    {
        _context = context;
        _config = config;
        _mapper = mapper;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest dto)
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // Check if user is a SuperAdmin
                var superAdmin = await _context.SuperAdmins
                    .FirstOrDefaultAsync(sa => sa.SuperadminEmail == dto.Email && sa.IsActive == true);

                if (superAdmin != null && BCrypt.Net.BCrypt.Verify(dto.Password, superAdmin.SuperadminPassword))
                {
                    // SuperAdmin login successful

                    var auditLogSA = new AuditLog
                    {
                        AdminId = null,
                        SuperadminId = superAdmin.SuperadminId,
                        CompanyId = null,
                        Action = AuditAction.login,
                        TableName = "SuperAdmin",
                        RecordId = superAdmin.SuperadminId.ToString(),
                        NewData = SafeSerializeAuditLog(new
                        {
                            Message = "Successful login",
                            Email = superAdmin.SuperadminEmail,
                            LoginTime = DateTime.UtcNow,
                            Status = "Success"
                        }),
                        ActionTimestamp = DateTime.UtcNow,
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                    };
                    try
                    {
                        _context.AuditLogs.Add(auditLogSA);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                    }
                    catch (DbUpdateException dbEx)
                    {
                        // Log the actual error
                        var innerException = dbEx.InnerException?.Message ?? dbEx.Message;
                        Console.WriteLine($"Database error when logging superadmin audit: {innerException}");

                        // Don't fail the login just because audit logging failed
                        // You might want to log this error somewhere else
                    }

                    return Ok(new LoginResponse
                    {
                        Token = GenerateJwtToken(superAdmin.SuperadminId.ToString(), "SuperAdmin"),
                        Expiration = DateTime.UtcNow.AddHours(8),
                        UserRole = "SuperAdmin",
                        User = new
                        {
                            Id = superAdmin.SuperadminId,
                            Email = superAdmin.SuperadminEmail,
                            FirstName = superAdmin.SuperadminFirstName,
                            LastName = superAdmin.SuperadminLastName
                        }
                    });
                }

                // If not SuperAdmin, check if Admin
                var admin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.AdminEmail == dto.Email && a.IsActive == true);

                // Using BCrypt password verification for security
                if (admin == null || !BCrypt.Net.BCrypt.Verify(dto.Password, admin.AdminPassword))
                { 
                return Unauthorized(new { message = "Invalid credentials." });
                }

                // Log successful login
                var auditLog = new AuditLog
                {
                    AdminId = admin.AdminId,
                    CompanyId = admin.CompanyId,
                    Action = AuditAction.login,
                    TableName = "Admin",
                    RecordId = admin.AdminId.ToString(),
                    NewData = SafeSerializeAuditLog(new
                {
                    Message = "Successful login",
                    Email = admin.AdminEmail,
                    LoginTime = DateTime.UtcNow,
                    Status = "Success"
                }),
                    ActionTimestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };
                _context.AuditLogs.Add(auditLog);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException dbEx)
                {
                    var sqlEx = dbEx.InnerException;
                    Console.WriteLine($" Save failed: {sqlEx?.Message}");

                    return StatusCode(500, new
                    {
                        Message = "Database save error.",
                        Detail = sqlEx?.Message,
                        FullStack = dbEx.StackTrace
                    });
                }

                // Admin login successful
                var token = GenerateJwtToken(admin.AdminId.ToString(), "Admin");
                var adminDto = _mapper.Map<AdminDTO>(admin);

                await transaction.CommitAsync();
                return Ok(new LoginResponse
                {
                    Token = token,
                    Expiration = DateTime.UtcNow.AddHours(8),
                    UserRole = "Admin",
                    User = adminDto
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // Return detailed error for debugging (remove in production)
                return StatusCode(500, new { Error = ex.Message, StackTrace = ex.StackTrace });
            }
        }
    }

    [HttpPost("admin/logout")]
    [Authorize]
    public async Task<IActionResult> AdminLogout()
    {
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // Get the current admin ID from JWT token
                var currentAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentAdminId))
                    return Unauthorized("Unable to identify current admin.");

                var admin = await _context.Admins.FindAsync(int.Parse(currentAdminId));
                if (admin == null)
                    return NotFound("Admin not found.");

                //// Log logout activity
                var auditLog = new AuditLog
                {
                   AdminId = admin.AdminId,
                   CompanyId = admin.CompanyId,
                   Action = AuditAction.logout,
                   TableName = "Admin",
                   RecordId = admin.AdminId.ToString(),
                   NewData = SafeSerializeAuditLog(new
                   {
                       Message = "Admin logout",
                       Email = admin.AdminEmail,
                       LogoutTime = DateTime.UtcNow
                   }),
                   ActionTimestamp = DateTime.UtcNow,
                   IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return Ok(new { Message = "Logged out successfully." });
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

    private string GenerateJwtToken(string userId, string role)
    {
        return GenerateJwtToken(userId, role, 8);
    }

    private string GenerateJwtToken(string userId, string role, int expiresInHours)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role)
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresInHours),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    
    [HttpPost("employee/login/face")]
    [AllowAnonymous]
    public async Task<ActionResult<FaceLoginResponse>> EmployeeFaceLogin([FromBody] FaceLoginRequest dto)
    {
        // 1. Get all employees and their face descriptors
        var employees = await _context.Employees
            .Where(e => e.EmployeeIsActive == true && !string.IsNullOrEmpty(e.EmployeeFaceId))
            .ToListAsync();
        var debugLog = new List<string>();

        debugLog.Add($"Found {employees.Count} active employees with face descriptors");

        // Log first employee's face ID for debugging
        if (employees.Any())
        {
            var firstEmp = employees.First();
            debugLog.Add($"First employee ID: {firstEmp.EmployeeId}, Face ID length: {firstEmp.EmployeeFaceId?.Length ?? 0}");
            debugLog.Add($"First 100 chars of face ID: {firstEmp.EmployeeFaceId?.Substring(0, Math.Min(100, firstEmp.EmployeeFaceId.Length))}");
        }

        // 2. Parse incoming descriptor
        var incoming = dto.FaceDescriptor;
        if (incoming == null || incoming.Count == 0)
            return BadRequest("Face descriptor is required.");

        Employee? matchedEmployee = null;
        double minDistance = double.MaxValue;
        const double threshold = 0.45; // between 0.4 and 0.5
        
        // Debug logging
        debugLog.Add($"Starting face recognition for descriptor with {incoming.Count} values");

        foreach (var emp in employees)
        {
            // Parse stored face descriptor robustly
            List<float>? storedDescriptor = null;
            try
            {
                var faceId = emp.EmployeeFaceId?.Trim();
                if (!string.IsNullOrEmpty(faceId))
                {
                    // Clean up the face descriptor string
                    faceId = faceId
                        .Replace("\r", "")  // Remove carriage returns
                        .Replace("\n", "")  // Remove newlines
                        .Replace(" ", "")  // Remove spaces
                        .Trim();

                    // Remove any trailing brackets or braces
                    faceId = faceId.TrimEnd(']', '}');
                    
                    // Remove the leading '[' if it exists
                    faceId = faceId.TrimStart('[');
                    
                    // Log the cleaned face descriptor for debugging
                    debugLog.Add($"Cleaned face descriptor (first 100 chars): {faceId[..Math.Min(100, faceId.Length)]}...");

                    try
                    {
                        // Split by comma and parse each value
                        var floatStrings = faceId.Split(',', StringSplitOptions.RemoveEmptyEntries);
                        storedDescriptor = new List<float>(floatStrings.Length);
                        
                        foreach (var str in floatStrings)
                        {
                            var cleanStr = str.Trim().TrimEnd(']', '}');
                            if (float.TryParse(cleanStr, System.Globalization.NumberStyles.Float, 
                                System.Globalization.CultureInfo.InvariantCulture, out float value))
                            {
                                storedDescriptor.Add(value);
                            }
                            else
                            {
                                debugLog.Add($"Failed to parse value at index {storedDescriptor.Count}: '{str}' for employee {emp.EmployeeId}");
                                storedDescriptor = null;
                                break;
                            }
                        }
                        
                        if (storedDescriptor != null)
                        {
                            debugLog.Add($"Successfully parsed {storedDescriptor.Count} values from face descriptor");
                            if (storedDescriptor.Count > 0)
                            {
                                debugLog.Add($"First 5 values: {string.Join(", ", storedDescriptor.Take(5))}...");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        debugLog.Add($"Manual parse failed for employee {emp.EmployeeId}: {ex.Message}");
                        storedDescriptor = null;
                    }
                }
            }
            catch
            {
                continue; // skip if cannot parse
            }
            if (storedDescriptor == null)
            {
                debugLog.Add($"Failed to parse face descriptor for employee {emp.EmployeeId}");
                continue;
            }
            
            if (storedDescriptor.Count != incoming.Count)
            {
                debugLog.Add($"Descriptor length mismatch for employee {emp.EmployeeId}. Expected: {incoming.Count}, Got: {storedDescriptor.Count}");
                continue;
            }

            // Log first few values for debugging
            if (debugLog.Count < 10) // Only log for first few employees to avoid too much output
            {
                debugLog.Add($"Employee {emp.EmployeeId} - First 5 stored values: {string.Join(", ", storedDescriptor.Take(5))}");
                if (emp == employees.First())
                {
                    debugLog.Add($"Incoming - First 5 values: {string.Join(", ", incoming.Take(5))}");
                }
            }

            // Calculate Euclidean distance
            double sum = 0;
            for (int i = 0; i < incoming.Count; i++)
            {
                double diff = incoming[i] - storedDescriptor[i];
                sum += diff * diff;
            }
            double dist = Math.Sqrt(sum);
            debugLog.Add($"Employee ID {emp.EmployeeId}: Calculated distance = {dist}");
            if (dist < minDistance)
            {
                minDistance = dist;
                matchedEmployee = emp;
                debugLog.Add($"New best match: Employee ID {emp.EmployeeId} with distance {dist}");
            }
        }

        debugLog.Add($"Best match: Employee ID {(string.IsNullOrEmpty(matchedEmployee?.EmployeeId) ? "-1" : matchedEmployee.EmployeeId)} with distance {minDistance} (threshold: {threshold})");
        
        if (matchedEmployee == null || minDistance > threshold)
        {
            debugLog.Add("Face recognition failed - no match found or distance exceeds threshold");
            Console.WriteLine(string.Join("\n", debugLog));
            return Unauthorized(new { 
                message = "Face not recognized.",
                debug = debugLog
            });
        }

        // Generate JWT token for employee, 4 hour expiry
        var token = GenerateJwtToken(matchedEmployee.EmployeeId, "Employee", 4);
        var empDto = new {
            matchedEmployee.EmployeeId,
            matchedEmployee.EmployeeFirstName,
            matchedEmployee.EmployeeLastName,
            matchedEmployee.EmployeeEmail,
            matchedEmployee.CompanyId,
            matchedEmployee.EmployeeDesignationId,
            matchedEmployee.EmployeePhone,
        };

        return Ok(new FaceLoginResponse
        {
            Token = token,
            Expiration = DateTime.UtcNow.AddHours(4),
            UserRole = "Employee",
            User = empDto
        });
    }
}
