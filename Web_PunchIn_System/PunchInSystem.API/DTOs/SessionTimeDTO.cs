using System;
using System.ComponentModel.DataAnnotations;

namespace PunchInSystem.API.DTOs
{
    public class SessionTimeDTO
    {
        public int SessionId { get; set; }
        public int PunchId { get; set; }
        public string EmployeeId { get; set; }
        public string SessionStatus { get; set; }
        public DateTime SessionStartTime { get; set; }
        public DateTime? SessionEndTime { get; set; }
        public decimal SessionLocationLong { get; set; }
        public decimal SessionLocationLat { get; set; }
        public TimeOnly? SessionBreakTime { get; set; }
    }

    public class CreateSessionTimeDTO
    {
        [Required]
        public int PunchId { get; set; }

        [Required]
        public string EmployeeId { get; set; }

        [Required]
        public string SessionStatus { get; set; }

        [Required]
        public DateTime SessionStartTime { get; set; }

        public DateTime? SessionEndTime { get; set; }

        [Required]
        public decimal SessionLocationLong { get; set; }

        [Required]
        public decimal SessionLocationLat { get; set; }

        public TimeOnly? SessionBreakTime { get; set; }
    }

    public class UpdateSessionTimeDTO
    {
        public string SessionStatus { get; set; }
        public DateTime? SessionEndTime { get; set; }
        public TimeOnly? SessionBreakTime { get; set; }
    }
}