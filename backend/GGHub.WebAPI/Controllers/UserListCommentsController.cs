﻿using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GGHub.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserListCommentsController : ControllerBase
    {
        private readonly IUserListCommentService _commentService;

        public UserListCommentsController(IUserListCommentService commentService)
        {
            _commentService = commentService;
        }

        [HttpPost("list/{listId}")]
        public async Task<IActionResult> CreateComment(int listId, [FromBody] UserListCommentForCreationDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var commentDto = await _commentService.CreateCommentAsync(listId, userId, dto);
                return CreatedAtAction(nameof(GetCommentById), new { commentId = commentDto.Id }, commentDto);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("list/{listId}")]
        public async Task<IActionResult> GetComments(int listId, [FromQuery] ListQueryParams query)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var comments = await _commentService.GetCommentsForListAsync(listId, userId, query);
                return Ok(comments);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        [HttpGet("{commentId}")]
        public async Task<IActionResult> GetCommentById(int commentId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var comment = await _commentService.GetCommentByIdAsync(commentId, userId);
                return Ok(comment);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
        }
        [HttpPut("{commentId}")]
        public async Task<IActionResult> UpdateComment(int commentId, [FromBody] UserListCommentForUpdateDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var success = await _commentService.UpdateCommentAsync(commentId, userId, dto);
                if (success) return NoContent();
                return BadRequest("Yorum güncellenemedi.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
        [HttpDelete("{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var success = await _commentService.DeleteCommentAsync(commentId, userId);
                if (success) return NoContent();
                return BadRequest("Yorum silinemedi.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
        [HttpPost("{commentId}/vote")]
        public async Task<IActionResult> VoteOnComment(int commentId, [FromBody] UserListCommentVoteDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var success = await _commentService.VoteOnCommentAsync(commentId, userId, dto);
                if (success) return Ok();
                return BadRequest("Oylama işlemi başarısız.");
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }
    }
}