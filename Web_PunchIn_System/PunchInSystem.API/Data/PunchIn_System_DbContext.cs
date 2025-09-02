using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using PunchInSystem.API.Models;

namespace PunchInSystem.API.Data;

public partial class PunchIn_System_DbContext : DbContext
{
    public PunchIn_System_DbContext()
    {
    }

    public PunchIn_System_DbContext(DbContextOptions<PunchIn_System_DbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Admin> Admins { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Break> Breaks { get; set; }

    public virtual DbSet<Company> Companies { get; set; }

    public virtual DbSet<Designation> Designations { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<LocationLog> LocationLogs { get; set; }

    public virtual DbSet<PunchIn> PunchIns { get; set; }

    public virtual DbSet<SessionTime> SessionTimes { get; set; }

    public virtual DbSet<SuperAdmin> SuperAdmins { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {

    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Admin>(entity =>
        {
            entity.HasKey(e => e.AdminId).HasName("PK__Admin__43AA4141D7F8329B");

            entity.ToTable("Admin");

            entity.HasIndex(e => e.AdminEmail, "UQ_Admin_Email").IsUnique();

            entity.Property(e => e.AdminId).HasColumnName("admin_id");
            entity.Property(e => e.AdminCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("admin_created_at");
            entity.Property(e => e.AdminCreatedById).HasColumnName("admin_created_by_id");
            entity.Property(e => e.AdminCreatedBySuperadminId).HasColumnName("admin_created_by_superadmin_id");
            entity.Property(e => e.AdminDeletedAt)
                .HasColumnType("datetime")
                .HasColumnName("admin_deleted_at");
            entity.Property(e => e.AdminDeletedById).HasColumnName("admin_deleted_by_id");
            entity.Property(e => e.AdminDeletedBySuperadminId).HasColumnName("admin_deleted_by_superadmin_id");
            entity.Property(e => e.AdminDob).HasColumnName("admin_dob");
            entity.Property(e => e.AdminEmail)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("admin_email");
            entity.Property(e => e.AdminFirstName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("admin_first_name");
            entity.Property(e => e.AdminIsDeleted).HasColumnName("admin_is_deleted");
            entity.Property(e => e.AdminLastName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("admin_last_name");
            entity.Property(e => e.AdminMiddleName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("admin_middle_name");
            entity.Property(e => e.AdminPassword)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("admin_password");
            entity.Property(e => e.AdminPhone)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("admin_phone");
            entity.Property(e => e.AdminUpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("admin_updated_at");
            entity.Property(e => e.AdminUpdatedById).HasColumnName("admin_updated_by_id");
            entity.Property(e => e.AdminUpdatedBySuperadminId).HasColumnName("admin_updated_by_superadmin_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");

            entity.HasOne(d => d.AdminCreatedBy).WithMany(p => p.InverseAdminCreatedBy)
                .HasForeignKey(d => d.AdminCreatedById)
                .HasConstraintName("FK__Admin__admin_cre__5DCAEF64");

            entity.HasOne(d => d.AdminCreatedBySuperadmin).WithMany(p => p.AdminAdminCreatedBySuperadmins)
                .HasForeignKey(d => d.AdminCreatedBySuperadminId)
                .HasConstraintName("FK__Admin__admin_cre__60A75C0F");

            entity.HasOne(d => d.AdminDeletedBy).WithMany(p => p.InverseAdminDeletedBy)
                .HasForeignKey(d => d.AdminDeletedById)
                .HasConstraintName("FK__Admin__admin_del__5FB337D6");

            entity.HasOne(d => d.AdminDeletedBySuperadmin).WithMany(p => p.AdminAdminDeletedBySuperadmins)
                .HasForeignKey(d => d.AdminDeletedBySuperadminId)
                .HasConstraintName("FK__Admin__admin_del__628FA481");

            entity.HasOne(d => d.AdminUpdatedBy).WithMany(p => p.InverseAdminUpdatedBy)
                .HasForeignKey(d => d.AdminUpdatedById)
                .HasConstraintName("FK__Admin__admin_upd__5EBF139D");

            entity.HasOne(d => d.AdminUpdatedBySuperadmin).WithMany(p => p.AdminAdminUpdatedBySuperadmins)
                .HasForeignKey(d => d.AdminUpdatedBySuperadminId)
                .HasConstraintName("FK__Admin__admin_upd__619B8048");

            entity.HasOne(d => d.Company).WithMany(p => p.Admins)
                .HasForeignKey(d => d.CompanyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Admin__company_i__5CD6CB2B");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.AuditId).HasName("PK__AuditLog__5AF33E33A2850CDC");

            entity.ToTable("AuditLog");

            entity.Property(e => e.AuditId).HasColumnName("audit_id");
            entity.Property(e => e.Action)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasColumnName("action");
            entity.Property(e => e.ActionTimestamp)
                .HasColumnType("datetime")
                .HasColumnName("action_timestamp");
            entity.Property(e => e.AdminId).HasColumnName("admin_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(45)
                .IsUnicode(false)
                .HasColumnName("ip_address");
            entity.Property(e => e.NewData).HasColumnName("new_data");
            entity.Property(e => e.OldData).HasColumnName("old_data");
            entity.Property(e => e.RecordId)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("record_id");
            entity.Property(e => e.SuperadminId).HasColumnName("superadmin_id");
            entity.Property(e => e.TableName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("table_name");

            entity.HasOne(d => d.Company).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("FK__AuditLog__compan__123EB7A3");

            entity.HasOne(d => d.Superadmin).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.SuperadminId)
                .HasConstraintName("FK__AuditLog__supera__114A936A");
        });

        modelBuilder.Entity<Break>(entity =>
        {
            entity.HasKey(e => e.BreakId).HasName("PK__Breaks__82929CEFDF66632F");

            entity.Property(e => e.BreakId).HasColumnName("break_id");
            entity.Property(e => e.BreakCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("break_created_at");
            entity.Property(e => e.BreakEnd)
                .HasColumnType("datetime")
                .HasColumnName("break_end");
            entity.Property(e => e.BreakStart)
                .HasColumnType("datetime")
                .HasColumnName("break_start");
            entity.Property(e => e.BreakType)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("break_type");
            entity.Property(e => e.EmployeeId)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("employee_id");
            entity.Property(e => e.SessionId).HasColumnName("session_id");

            entity.HasOne(d => d.Session).WithMany(p => p.Breaks)
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Breaks__session___09A971A2");
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(e => e.CompanyId).HasName("PK__Company__3E2672355872A93E");

            entity.ToTable("Company");

            entity.HasIndex(e => e.CompanyEmail, "UQ__Company__7C4661D11B0E40C9").IsUnique();

            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CompanyAddress)
                .IsUnicode(false)
                .HasColumnName("company_address");
            entity.Property(e => e.CompanyCity)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("company_city");
            entity.Property(e => e.CompanyCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("company_created_at");
            entity.Property(e => e.CompanyCreatedBySuperadminId).HasColumnName("company_created_by_superadmin_id");
            entity.Property(e => e.CompanyDeletedAt)
                .HasColumnType("datetime")
                .HasColumnName("company_deleted_at");
            entity.Property(e => e.CompanyDeletedBySuperadminId).HasColumnName("company_deleted_by_superadmin_id");
            entity.Property(e => e.CompanyEmail)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("company_email");
            entity.Property(e => e.CompanyIsDeleted).HasColumnName("company_is_deleted");
            entity.Property(e => e.CompanyName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("company_name");
            entity.Property(e => e.CompanyState)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("company_state");
            entity.Property(e => e.CompanyType)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("company_type");
            entity.Property(e => e.ContactNo)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("contact_no");

            entity.HasOne(d => d.CompanyCreatedBySuperadmin).WithMany(p => p.CompanyCompanyCreatedBySuperadmins)
                .HasForeignKey(d => d.CompanyCreatedBySuperadminId)
                .HasConstraintName("FK__Company__company__5535A963");

            entity.HasOne(d => d.CompanyDeletedBySuperadmin).WithMany(p => p.CompanyCompanyDeletedBySuperadmins)
                .HasForeignKey(d => d.CompanyDeletedBySuperadminId)
                .HasConstraintName("FK__Company__company__5629CD9C");
        });

        modelBuilder.Entity<Designation>(entity =>
        {
            entity.HasKey(e => e.DesignationId).HasName("PK__Designat__177649C135129637");

            entity.ToTable("Designation");

            entity.HasIndex(e => new { e.CompanyId, e.DesignationName }, "UQ_Company_Designation").IsUnique();

            entity.Property(e => e.DesignationId).HasColumnName("designation_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.DesignationCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("designation_created_at");
            entity.Property(e => e.DesignationDeletedAt)
                .HasColumnType("datetime")
                .HasColumnName("designation_deleted_at");
            entity.Property(e => e.DesignationDeletedById).HasColumnName("designation_deleted_by_id");
            entity.Property(e => e.DesignationDeletedBySuperadminId).HasColumnName("designation_deleted_by_superadmin_id");
            entity.Property(e => e.DesignationDescription)
                .IsUnicode(false)
                .HasColumnName("designation_description");
            entity.Property(e => e.DesignationIsDeleted).HasColumnName("designation_is_deleted");
            entity.Property(e => e.DesignationName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("designation_name");

            entity.HasOne(d => d.Company).WithMany(p => p.Designations)
                .HasForeignKey(d => d.CompanyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Designati__compa__68487DD7");

            entity.HasOne(d => d.DesignationDeletedBy).WithMany(p => p.Designations)
                .HasForeignKey(d => d.DesignationDeletedById)
                .HasConstraintName("FK__Designati__desig__693CA210");

            entity.HasOne(d => d.DesignationDeletedBySuperadmin).WithMany(p => p.Designations)
                .HasForeignKey(d => d.DesignationDeletedBySuperadminId)
                .HasConstraintName("FK__Designati__desig__6A30C649");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId).HasName("PK__Employee__C52E0BA84BF66BD9");

            entity.HasIndex(e => e.EmployeeEmail, "UQ_Employee_Email").IsUnique();

            entity.Property(e => e.EmployeeId)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("employee_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.EmployeeCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("employee_created_at");
            entity.Property(e => e.EmployeeCreatedById).HasColumnName("employee_created_by_id");
            entity.Property(e => e.EmployeeCreatedBySuperadminId).HasColumnName("employee_created_by_superadmin_id");
            entity.Property(e => e.EmployeeDeletedAt)
                .HasColumnType("datetime")
                .HasColumnName("employee_deleted_at");
            entity.Property(e => e.EmployeeDeletedById).HasColumnName("employee_deleted_by_id");
            entity.Property(e => e.EmployeeDeletedBySuperadminId).HasColumnName("employee_deleted_by_superadmin_id");
            entity.Property(e => e.EmployeeDesignationId).HasColumnName("employee_designation_id");
            entity.Property(e => e.EmployeeDob).HasColumnName("employee_dob");
            entity.Property(e => e.EmployeeEmail)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("employee_email");
            entity.Property(e => e.EmployeeFaceId).HasColumnName("employee_face_id");
            entity.Property(e => e.EmployeeFaceImage).HasColumnName("employee_face_image");
            entity.Property(e => e.EmployeeFirstName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("employee_first_name");
            entity.Property(e => e.EmployeeIsActive).HasColumnName("employee_is_active");
            entity.Property(e => e.EmployeeIsDeleted).HasColumnName("employee_is_deleted");
            entity.Property(e => e.EmployeeLastLogin)
                .HasColumnType("datetime")
                .HasColumnName("employee_last_login");
            entity.Property(e => e.EmployeeLastName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("employee_last_name");
            entity.Property(e => e.EmployeeLocationHome)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("employee_location_home");
            entity.Property(e => e.EmployeeMiddleName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("employee_middle_name");
            entity.Property(e => e.EmployeePhone)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("employee_phone");
            entity.Property(e => e.EmployeeUpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("employee_updated_at");
            entity.Property(e => e.EmployeeUpdatedById).HasColumnName("employee_updated_by_id");
            entity.Property(e => e.EmployeeUpdatedBySuperadminId).HasColumnName("employee_updated_by_superadmin_id");

            entity.HasOne(d => d.Company).WithMany(p => p.Employees)
                .HasForeignKey(d => d.CompanyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Employees__compa__0C50D423");

            entity.HasOne(d => d.EmployeeCreatedBy).WithMany(p => p.EmployeeEmployeeCreatedBies)
                .HasForeignKey(d => d.EmployeeCreatedById)
                .HasConstraintName("FK__Employees__emplo__0E391C95");

            entity.HasOne(d => d.EmployeeCreatedBySuperadmin).WithMany(p => p.EmployeeEmployeeCreatedBySuperadmins)
                .HasForeignKey(d => d.EmployeeCreatedBySuperadminId)
                .HasConstraintName("FK__Employees__emplo__11158940");

            entity.HasOne(d => d.EmployeeDeletedBy).WithMany(p => p.EmployeeEmployeeDeletedBies)
                .HasForeignKey(d => d.EmployeeDeletedById)
                .HasConstraintName("FK__Employees__emplo__10216507");

            entity.HasOne(d => d.EmployeeDeletedBySuperadmin).WithMany(p => p.EmployeeEmployeeDeletedBySuperadmins)
                .HasForeignKey(d => d.EmployeeDeletedBySuperadminId)
                .HasConstraintName("FK__Employees__emplo__12FDD1B2");

            entity.HasOne(d => d.EmployeeDesignation).WithMany(p => p.Employees)
                .HasForeignKey(d => d.EmployeeDesignationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Employees__emplo__0D44F85C");

            entity.HasOne(d => d.EmployeeUpdatedBy).WithMany(p => p.EmployeeEmployeeUpdatedBies)
                .HasForeignKey(d => d.EmployeeUpdatedById)
                .HasConstraintName("FK__Employees__emplo__0F2D40CE");

            entity.HasOne(d => d.EmployeeUpdatedBySuperadmin).WithMany(p => p.EmployeeEmployeeUpdatedBySuperadmins)
                .HasForeignKey(d => d.EmployeeUpdatedBySuperadminId)
                .HasConstraintName("FK__Employees__emplo__1209AD79");
        });

        modelBuilder.Entity<LocationLog>(entity =>
        {
            entity.HasKey(e => e.LocationLogId).HasName("PK__Location__41D3A6B495CF364A");

            entity.Property(e => e.LocationLogId).HasColumnName("location_log_id");
            entity.Property(e => e.EmployeeId)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("employee_id");
            entity.Property(e => e.LocationCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("location_created_at");
            entity.Property(e => e.LocationLat)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("location_lat");
            entity.Property(e => e.LocationLong)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("location_long");
            entity.Property(e => e.LogTimestamp)
                .HasColumnType("datetime")
                .HasColumnName("log_timestamp");
            entity.Property(e => e.SessionId).HasColumnName("session_id");

            entity.HasOne(d => d.Session).WithMany(p => p.LocationLogs)
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__LocationL__sessi__04E4BC85");
        });

        modelBuilder.Entity<PunchIn>(entity =>
        {
            entity.HasKey(e => e.PunchId).HasName("PK__PunchIn__36AE15A699891DF9");

            entity.ToTable("PunchIn");

            entity.Property(e => e.PunchId).HasColumnName("punch_id");
            entity.Property(e => e.EmployeeId)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("employee_id");
            entity.Property(e => e.PunchCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("punch_created_at");
            entity.Property(e => e.PunchFaceId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("punch_face_id");
            entity.Property(e => e.PunchFaceUrl)
                .IsUnicode(false)
                .HasColumnName("punch_face_url");
            entity.Property(e => e.PunchLocationLat)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("punch_location_lat");
            entity.Property(e => e.PunchLocationLong)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("punch_location_long");
            entity.Property(e => e.PunchTimestamp)
                .HasColumnType("datetime")
                .HasColumnName("punch_timestamp");
            entity.Property(e => e.PunchUpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("punch_updated_at");
        });

        modelBuilder.Entity<SessionTime>(entity =>
        {
            entity.HasKey(e => e.SessionId).HasName("PK__SessionT__69B13FDC7824F979");

            entity.ToTable("SessionTime");

            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.EmployeeId)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("employee_id");
            entity.Property(e => e.PunchId).HasColumnName("punch_id");
            entity.Property(e => e.SessionBreakTime).HasColumnName("session_break_time");
            entity.Property(e => e.SessionEndTime)
                .HasColumnType("datetime")
                .HasColumnName("session_end_time");
            entity.Property(e => e.SessionLocationLat)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("session_location_lat");
            entity.Property(e => e.SessionLocationLong)
                .HasColumnType("decimal(10, 7)")
                .HasColumnName("session_location_long");
            entity.Property(e => e.SessionStartTime)
                .HasColumnType("datetime")
                .HasColumnName("session_start_time");
            entity.Property(e => e.SessionStatus)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("session_status");

            entity.HasOne(d => d.Punch).WithMany(p => p.SessionTimes)
                .HasForeignKey(d => d.PunchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__SessionTi__punch__00200768");
        });

        modelBuilder.Entity<SuperAdmin>(entity =>
        {
            entity.HasKey(e => e.SuperadminId).HasName("PK__SuperAdm__E0CDB483E79A4F3E");

            entity.ToTable("SuperAdmin");

            entity.HasIndex(e => e.SuperadminEmail, "UQ_SuperAdmin_Email").IsUnique();

            entity.Property(e => e.SuperadminId).HasColumnName("superadmin_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.SuperadminCreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("superadmin_created_at");
            entity.Property(e => e.SuperadminCreatedById).HasColumnName("superadmin_created_by_id");
            entity.Property(e => e.SuperadminDeletedAt)
                .HasColumnType("datetime")
                .HasColumnName("superadmin_deleted_at");
            entity.Property(e => e.SuperadminDeletedById).HasColumnName("superadmin_deleted_by_id");
            entity.Property(e => e.SuperadminDob).HasColumnName("superadmin_dob");
            entity.Property(e => e.SuperadminEmail)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("superadmin_email");
            entity.Property(e => e.SuperadminFirstName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("superadmin_first_name");
            entity.Property(e => e.SuperadminIsDeleted).HasColumnName("superadmin_is_deleted");
            entity.Property(e => e.SuperadminLastName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("superadmin_last_name");
            entity.Property(e => e.SuperadminMiddleName)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("superadmin_middle_name");
            entity.Property(e => e.SuperadminPassword)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("superadmin_password");
            entity.Property(e => e.SuperadminPhone)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("superadmin_phone");
            entity.Property(e => e.SuperadminUpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("superadmin_updated_at");
            entity.Property(e => e.SuperadminUpdatedById).HasColumnName("superadmin_updated_by_id");

            entity.HasOne(d => d.SuperadminCreatedBy).WithMany(p => p.InverseSuperadminCreatedBy)
                .HasForeignKey(d => d.SuperadminCreatedById)
                .HasConstraintName("FK__SuperAdmi__super__4D94879B");

            entity.HasOne(d => d.SuperadminDeletedBy).WithMany(p => p.InverseSuperadminDeletedBy)
                .HasForeignKey(d => d.SuperadminDeletedById)
                .HasConstraintName("FK__SuperAdmi__super__4F7CD00D");

            entity.HasOne(d => d.SuperadminUpdatedBy).WithMany(p => p.InverseSuperadminUpdatedBy)
                .HasForeignKey(d => d.SuperadminUpdatedById)
                .HasConstraintName("FK__SuperAdmi__super__4E88ABD4");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
