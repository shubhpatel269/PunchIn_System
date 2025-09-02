using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class PunchIn
{
    public int PunchId { get; set; }

    public string EmployeeId { get; set; } = null!;

    public DateTime PunchTimestamp { get; set; }

    public string PunchFaceUrl { get; set; } = null!;

    public string PunchFaceId { get; set; } = null!;

    public decimal PunchLocationLong { get; set; }

    public decimal PunchLocationLat { get; set; }

    public DateTime? PunchCreatedAt { get; set; }

    public DateTime? PunchUpdatedAt { get; set; }

    public virtual ICollection<SessionTime> SessionTimes { get; set; } = new List<SessionTime>();
}
