namespace PunchInSystem.API.DTOs;

public class AdminDTO
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
}

public class CreateAdminDTO
{
    public int CompanyId { get; set; }
    public string AdminFirstName { get; set; } = null!;
    public string? AdminMiddleName { get; set; }
    public string AdminLastName { get; set; } = null!;
    public string AdminEmail { get; set; } = null!;
    public string AdminPassword { get; set; } = null!;
    public string AdminPhone { get; set; } = null!;
    public DateOnly AdminDob { get; set; }
}

public class UpdateAdminDTO
{
    public int CompanyId { get; set; }
    public string? AdminFirstName { get; set; }
    public string? AdminMiddleName { get; set; }
    public string? AdminLastName { get; set; }
    public string? AdminEmail { get; set; }
    public string? AdminPhone { get; set; }
    public DateOnly? AdminDob { get; set; }
    public bool? IsActive { get; set; }
}
