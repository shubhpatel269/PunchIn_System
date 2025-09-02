using PunchInSystem.API.Models;

namespace PunchInSystem.API.DTOs;

public class AuditLogDto
{
    public int AuditId { get; set; }
    public int? AdminId { get; set; }
    public int? SuperadminId { get; set; }
    public int? CompanyId { get; set; }
    public AuditAction Action { get; set; }
    public string? TableName { get; set; }
    public string? RecordId { get; set; }
    public string? OldData { get; set; }
    public string? NewData { get; set; }
    public DateTime ActionTimestamp { get; set; }
    public string? IpAddress { get; set; }
}

public class CreateAuditLogDto
{
    public int? AdminId { get; set; }
    public int? SuperadminId { get; set; }

    public int? CompanyId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? TableName { get; set; }
    public string? RecordId { get; set; }
    public string? OldData { get; set; }
    public string? NewData { get; set; }
    public string? IpAddress { get; set; }
}
