using System.ComponentModel.DataAnnotations;

namespace PunchInSystem.API.DTOs;

public class EmployeeDTO
{
    public string EmployeeId { get; set; } = null!;
    public int CompanyId { get; set; }
    public int EmployeeDesignationId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string EmployeeFirstName { get; set; } = null!;
    
    [StringLength(100)]
    public string? EmployeeMiddleName { get; set; }
    
    [Required]
    [StringLength(100)]
    public string EmployeeLastName { get; set; } = null!;
    
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string EmployeeEmail { get; set; } = null!;
    
    [Required]
    public DateOnly EmployeeDob { get; set; }
    
    [Required]
    [Phone]
    [StringLength(20)]
    public string EmployeePhone { get; set; } = null!;
    
    [Required]
    public string? EmployeeFaceImage { get; set; }
    
    [Required]
    public string? EmployeeFaceId { get; set; }
    
    [Required]
    [StringLength(500)]
    public string? EmployeeLocationHome { get; set; }
    
    public bool? EmployeeIsActive { get; set; } = true;
}

public class CreateEmployeeDTO
{
    [StringLength(30)]
    public string? EmployeeId { get; set; }
    
    // CompanyId is optional for Admin users as it will be detected automatically
    public int? CompanyId { get; set; }
    public int EmployeeDesignationId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string EmployeeFirstName { get; set; } = null!;
    
    [StringLength(100)]
    public string? EmployeeMiddleName { get; set; }
    
    [Required]
    [StringLength(100)]
    public string EmployeeLastName { get; set; } = null!;
    
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string EmployeeEmail { get; set; } = null!;
    
    [Required]
    public DateOnly EmployeeDob { get; set; }
    
    [Required]
    [Phone]
    [StringLength(20)]
    public string EmployeePhone { get; set; } = null!;
    
    [Required]
    public string? EmployeeFaceImage { get; set; }
    
    [Required]
    public string? EmployeeFaceId { get; set; }
    
    [Required]
    [StringLength(500)]
    public string? EmployeeLocationHome { get; set; }
    
    public bool? EmployeeIsActive { get; set; } = true;
}

public class UpdateEmployeeDTO : EmployeeDTO { }
