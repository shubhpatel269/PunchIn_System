using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class Break
{
    public int BreakId { get; set; }

    public int SessionId { get; set; }

    public string EmployeeId { get; set; } = null!;

    public DateTime BreakStart { get; set; }

    public DateTime? BreakEnd { get; set; }

    public string? BreakType { get; set; }

    public DateTime? BreakCreatedAt { get; set; }

    public virtual SessionTime Session { get; set; } = null!;
}
