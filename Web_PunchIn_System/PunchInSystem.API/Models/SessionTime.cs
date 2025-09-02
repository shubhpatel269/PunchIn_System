using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class SessionTime
{
    public int SessionId { get; set; }

    public int PunchId { get; set; }

    public string EmployeeId { get; set; } = null!;

    public string SessionStatus { get; set; } = null!;

    public DateTime SessionStartTime { get; set; }

    public DateTime? SessionEndTime { get; set; }

    public decimal SessionLocationLong { get; set; }

    public decimal SessionLocationLat { get; set; }

    public TimeOnly? SessionBreakTime { get; set; }

    public virtual ICollection<Break> Breaks { get; set; } = new List<Break>();

    public virtual ICollection<LocationLog> LocationLogs { get; set; } = new List<LocationLog>();

    public virtual PunchIn Punch { get; set; } = null!;
}
