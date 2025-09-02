using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PunchInSystem.API.Data;
using PunchInSystem.API.DTOs;
using PunchInSystem.API.Models;

namespace PunchInSystem.API.Controllers;

using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly PunchIn_System_DbContext _context;
    private readonly IMapper _mapper;

    public AuditLogController(PunchIn_System_DbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLogDto>>> GetAuditLogs()
    {
        var logs = await _context.AuditLogs.ToListAsync();
        return Ok(_mapper.Map<IEnumerable<AuditLogDto>>(logs));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AuditLogDto>> GetAuditLog(int id)
    {
        var log = await _context.AuditLogs.FindAsync(id);
        if (log == null) return NotFound();
        return Ok(_mapper.Map<AuditLogDto>(log));
    }

    [HttpPost]
    public async Task<ActionResult<AuditLogDto>> CreateAuditLog(CreateAuditLogDto dto)
    {
        var log = _mapper.Map<AuditLog>(dto);
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAuditLog), new { id = log.AuditId }, _mapper.Map<AuditLogDto>(log));
    }
}
