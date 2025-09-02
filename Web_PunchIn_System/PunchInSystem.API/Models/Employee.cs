using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class Employee
{
    public string EmployeeId { get; set; } = null!;

    public int CompanyId { get; set; }

    public int EmployeeDesignationId { get; set; }

    public string EmployeeFirstName { get; set; } = null!;

    public string? EmployeeMiddleName { get; set; }

    public string EmployeeLastName { get; set; } = null!;

    public string EmployeeEmail { get; set; } = null!;

    public DateOnly EmployeeDob { get; set; }

    public string EmployeePhone { get; set; } = null!;

    public string EmployeeFaceImage { get; set; } = null!;

    public string EmployeeFaceId { get; set; } = null!;

    public string EmployeeLocationHome { get; set; } = null!;

    public bool? EmployeeIsActive { get; set; }

    public DateTime? EmployeeLastLogin { get; set; }

    public DateTime? EmployeeCreatedAt { get; set; }

    public int? EmployeeCreatedById { get; set; }

    public int? EmployeeCreatedBySuperadminId { get; set; }

    public DateTime? EmployeeUpdatedAt { get; set; }

    public int? EmployeeUpdatedById { get; set; }

    public int? EmployeeUpdatedBySuperadminId { get; set; }

    public bool? EmployeeIsDeleted { get; set; }

    public DateTime? EmployeeDeletedAt { get; set; }

    public int? EmployeeDeletedById { get; set; }

    public int? EmployeeDeletedBySuperadminId { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual Admin? EmployeeCreatedBy { get; set; }

    public virtual SuperAdmin? EmployeeCreatedBySuperadmin { get; set; }

    public virtual Admin? EmployeeDeletedBy { get; set; }

    public virtual SuperAdmin? EmployeeDeletedBySuperadmin { get; set; }

    public virtual Designation EmployeeDesignation { get; set; } = null!;

    public virtual Admin? EmployeeUpdatedBy { get; set; }

    public virtual SuperAdmin? EmployeeUpdatedBySuperadmin { get; set; }
}
