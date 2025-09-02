using System;
using System.ComponentModel.DataAnnotations;

namespace PunchInSystem.API.DTOs
{
    public class BreakDTO
    {
        public int BreakId { get; set; }
        public int SessionId { get; set; }
        public string EmployeeId { get; set; }
        public DateTime BreakStart { get; set; }
        public DateTime? BreakEnd { get; set; }
        public string BreakType { get; set; }
        public DateTime? BreakCreatedAt { get; set; }
    }

    public class CreateBreakDTO
    {
        [Required]
        public int SessionId { get; set; }

        [Required]
        public string EmployeeId { get; set; }

        [Required]
        public DateTime BreakStart { get; set; }

        public DateTime? BreakEnd { get; set; }

        public string BreakType { get; set; }
    }

    public class UpdateBreakDTO
    {
        public DateTime? BreakEnd { get; set; }
        public string BreakType { get; set; }
    }
}