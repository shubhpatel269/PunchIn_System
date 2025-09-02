using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class Admin
{
    public int AdminId { get; set; }

    public int CompanyId { get; set; }

    public string AdminFirstName { get; set; } = null!;

    public string? AdminMiddleName { get; set; }

    public string AdminLastName { get; set; } = null!;

    public string AdminEmail { get; set; } = null!;

    public string AdminPassword { get; set; } = null!;

    public string AdminPhone { get; set; } = null!;

    public DateOnly AdminDob { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? AdminCreatedAt { get; set; }

    public int? AdminCreatedById { get; set; }

    public int? AdminCreatedBySuperadminId { get; set; }

    public DateTime? AdminUpdatedAt { get; set; }

    public int? AdminUpdatedById { get; set; }

    public int? AdminUpdatedBySuperadminId { get; set; }

    public bool? AdminIsDeleted { get; set; }

    public DateTime? AdminDeletedAt { get; set; }

    public int? AdminDeletedById { get; set; }

    public int? AdminDeletedBySuperadminId { get; set; }

    public virtual Admin? AdminCreatedBy { get; set; }

    public virtual SuperAdmin? AdminCreatedBySuperadmin { get; set; }

    public virtual Admin? AdminDeletedBy { get; set; }

    public virtual SuperAdmin? AdminDeletedBySuperadmin { get; set; }

    public virtual Admin? AdminUpdatedBy { get; set; }

    public virtual SuperAdmin? AdminUpdatedBySuperadmin { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<Employee> EmployeeEmployeeCreatedBies { get; set; } = new List<Employee>();

    public virtual ICollection<Employee> EmployeeEmployeeDeletedBies { get; set; } = new List<Employee>();

    public virtual ICollection<Employee> EmployeeEmployeeUpdatedBies { get; set; } = new List<Employee>();

    public virtual ICollection<Admin> InverseAdminCreatedBy { get; set; } = new List<Admin>();

    public virtual ICollection<Admin> InverseAdminDeletedBy { get; set; } = new List<Admin>();

    public virtual ICollection<Admin> InverseAdminUpdatedBy { get; set; } = new List<Admin>();
}
