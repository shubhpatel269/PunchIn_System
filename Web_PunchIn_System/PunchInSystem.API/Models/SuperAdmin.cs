using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class SuperAdmin
{
    public int SuperadminId { get; set; }

    public string SuperadminFirstName { get; set; } = null!;

    public string? SuperadminMiddleName { get; set; }

    public string SuperadminLastName { get; set; } = null!;

    public string SuperadminEmail { get; set; } = null!;

    public string SuperadminPassword { get; set; } = null!;

    public string SuperadminPhone { get; set; } = null!;

    public DateOnly SuperadminDob { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? SuperadminCreatedAt { get; set; }

    public int? SuperadminCreatedById { get; set; }

    public DateTime? SuperadminUpdatedAt { get; set; }

    public int? SuperadminUpdatedById { get; set; }

    public bool? SuperadminIsDeleted { get; set; }

    public DateTime? SuperadminDeletedAt { get; set; }

    public int? SuperadminDeletedById { get; set; }

    public virtual ICollection<Admin> AdminAdminCreatedBySuperadmins { get; set; } = new List<Admin>();

    public virtual ICollection<Admin> AdminAdminDeletedBySuperadmins { get; set; } = new List<Admin>();

    public virtual ICollection<Admin> AdminAdminUpdatedBySuperadmins { get; set; } = new List<Admin>();

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Company> CompanyCompanyCreatedBySuperadmins { get; set; } = new List<Company>();

    public virtual ICollection<Company> CompanyCompanyDeletedBySuperadmins { get; set; } = new List<Company>();

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<Employee> EmployeeEmployeeCreatedBySuperadmins { get; set; } = new List<Employee>();

    public virtual ICollection<Employee> EmployeeEmployeeDeletedBySuperadmins { get; set; } = new List<Employee>();

    public virtual ICollection<Employee> EmployeeEmployeeUpdatedBySuperadmins { get; set; } = new List<Employee>();

    public virtual ICollection<SuperAdmin> InverseSuperadminCreatedBy { get; set; } = new List<SuperAdmin>();

    public virtual ICollection<SuperAdmin> InverseSuperadminDeletedBy { get; set; } = new List<SuperAdmin>();

    public virtual ICollection<SuperAdmin> InverseSuperadminUpdatedBy { get; set; } = new List<SuperAdmin>();

    public virtual SuperAdmin? SuperadminCreatedBy { get; set; }

    public virtual SuperAdmin? SuperadminDeletedBy { get; set; }

    public virtual SuperAdmin? SuperadminUpdatedBy { get; set; }
}
