import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Get('search')
  searchUsers(@Query('q') q: string) {
    return this.usersService.searchUsers(q);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}