using AutoMapper;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;

namespace PunchInSystem.API.Mappings
{
    public class AutoMapperProfile:Profile
    {
        public AutoMapperProfile()
        {
            CreateMap<Admin, AdminDTO>()
                      .ForMember(dest => dest.CompanyId, opt => opt.MapFrom(src => src.Company.CompanyId));
            CreateMap<CreateAdminDTO, Admin>();
            CreateMap<UpdateAdminDTO, Admin>();

            CreateMap<Company, CompanyDto>();
            CreateMap<CreateCompanyDto, Company>();
            CreateMap<UpdateCompanyDto, Company>();

            CreateMap<Designation, DesignationDto>();
            CreateMap<CreateDesignationDto, Designation>();
            CreateMap<UpdateDesignationDto, Designation>();

            CreateMap<AuditLog, AuditLogDto>()
           .ForMember(dest => dest.Action, opt => opt.MapFrom(src => src.Action.ToString()));
            CreateMap<CreateAuditLogDto, AuditLog>()
                .ForMember(dest => dest.Action, opt => opt.MapFrom(src => Enum.Parse<AuditAction>(src.Action, true)));

            CreateMap<PunchIn, PunchInDTO>();
            CreateMap<CreatePunchInDTO, PunchIn>();
            CreateMap<UpdatePunchInDTO, PunchIn>();
        }

    }
}
