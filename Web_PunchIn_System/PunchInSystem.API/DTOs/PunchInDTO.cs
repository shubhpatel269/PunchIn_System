using System;
using System.ComponentModel.DataAnnotations;

namespace PunchInSystem.API.DTOs
{
    public class PunchInDTO
    {
        public int PunchId { get; set; }
        public string EmployeeId { get; set; }
        public DateTime PunchTimestamp { get; set; }
        public string PunchFaceUrl { get; set; }
        public string PunchFaceId { get; set; }
        public decimal PunchLocationLong { get; set; }
        public decimal PunchLocationLat { get; set; }
        public DateTime? PunchCreatedAt { get; set; }
        public DateTime? PunchUpdatedAt { get; set; }
    }

    public class CreatePunchInDTO
    {
        [Required]
        public string EmployeeId { get; set; }

        [Required]
        public DateTime PunchTimestamp { get; set; }

        [Required]
        public string PunchFaceUrl { get; set; }

        [Required]
        public string PunchFaceId { get; set; }

        [Required]
        public decimal PunchLocationLong { get; set; }

        [Required]
        public decimal PunchLocationLat { get; set; }
    }

    public class UpdatePunchInDTO
    {
        public string PunchFaceUrl { get; set; }
        public string PunchFaceId { get; set; }
        public decimal PunchLocationLong { get; set; }
        public decimal PunchLocationLat { get; set; }
    }
}