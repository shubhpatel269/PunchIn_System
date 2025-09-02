using System;
using System.Collections.Generic;
using System.ComponentModel;

namespace PunchInSystem.API.Models;

public enum AuditAction
{
    [Description("insert")]
    insert,
    [Description("update")]
    update,
    [Description("delete")]
    delete,
    [Description("login")]
    login,
    [Description("logout")]
    logout
}


public partial class AuditLog
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

    public DateTime? ActionTimestamp { get; set; }

    public string? IpAddress { get; set; }
    public virtual Admin? Admin { get; set; }

    public virtual Company? Company { get; set; }

    public virtual SuperAdmin? Superadmin { get; set; }
}
