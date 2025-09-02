using System;
using System.Collections.Generic;

namespace PunchInSystem.API.Models;

public partial class Designation
{
    public int DesignationId { get; set; }

    public int CompanyId { get; set; }

    public string DesignationName { get; set; } = null!;

    public string? DesignationDescription { get; set; }

    public DateTime? DesignationCreatedAt { get; set; }

    public bool? DesignationIsDeleted { get; set; }

    public DateTime? DesignationDeletedAt { get; set; }

    public int? DesignationDeletedById { get; set; }

    public int? DesignationDeletedBySuperadminId { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual Admin? DesignationDeletedBy { get; set; }

    public virtual SuperAdmin? DesignationDeletedBySuperadmin { get; set; }

    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
