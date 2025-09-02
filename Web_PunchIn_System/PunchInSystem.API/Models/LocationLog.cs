using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class LocationLog
{
    public int LocationLogId { get; set; }

    public int SessionId { get; set; }

    public string EmployeeId { get; set; } = null!;

    public DateTime LogTimestamp { get; set; }

    public decimal LocationLong { get; set; }

    public decimal LocationLat { get; set; }

    public DateTime? LocationCreatedAt { get; set; }

    public virtual SessionTime Session { get; set; } = null!;
}
