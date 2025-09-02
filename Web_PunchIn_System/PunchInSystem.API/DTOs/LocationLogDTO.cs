using System;
using System.ComponentModel.DataAnnotations;

namespace PunchInSystem.API.DTOs
{
    public class LocationLogDTO
    {
        public int LocationLogId { get; set; }
        public int SessionId { get; set; }
        public string EmployeeId { get; set; }
        public DateTime LogTimestamp { get; set; }
        public decimal LocationLong { get; set; }
        public decimal LocationLat { get; set; }
        public DateTime? LocationCreatedAt { get; set; }
    }

    public class CreateLocationLogDTO
    {
        [Required]
        public int SessionId { get; set; }

        [Required]
        public string EmployeeId { get; set; }

        [Required]
        public DateTime LogTimestamp { get; set; }

        [Required]
        public decimal LocationLong { get; set; }

        [Required]
        public decimal LocationLat { get; set; }
    }

    public class UpdateLocationLogDTO
    {
        public decimal LocationLong { get; set; }
        public decimal LocationLat { get; set; }
    }
}