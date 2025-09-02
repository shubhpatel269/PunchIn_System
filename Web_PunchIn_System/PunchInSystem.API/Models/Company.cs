using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class Company
{
    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = null!;

    public string? ContactNo { get; set; }

    public string? CompanyEmail { get; set; }

    public string? CompanyType { get; set; }

    public string? CompanyAddress { get; set; }

    public string? CompanyCity { get; set; }

    public string? CompanyState { get; set; }

    public DateTime? CompanyCreatedAt { get; set; }

    public int? CompanyCreatedBySuperadminId { get; set; }

    public bool? CompanyIsDeleted { get; set; }

    public DateTime? CompanyDeletedAt { get; set; }

    public int? CompanyDeletedBySuperadminId { get; set; }

    public virtual ICollection<Admin> Admins { get; set; } = new List<Admin>();

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual SuperAdmin? CompanyCreatedBySuperadmin { get; set; }

    public virtual SuperAdmin? CompanyDeletedBySuperadmin { get; set; }

    public virtual ICollection<Designation> Designations { get; set; } = new List<Designation>();

    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
