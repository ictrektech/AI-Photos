import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Endpoint, HistoryBuilder } from 'src/decorators';
import { AuthDto } from 'src/dtos/auth.dto';
import { SearchExploreResponseDto } from 'src/dtos/search.dto';
import { ApiTag, Permission } from 'src/enum';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { SceneService } from 'src/services/scene.service';

@ApiTags(ApiTag.Search)
@Controller('search')
export class SceneController {
  constructor(private service: SceneService) {}

  @Get('scenes')
  @Authenticated({ permission: Permission.AssetRead })
  @Endpoint({
    summary: 'Retrieve scene classification data',
    description: 'Returns scene labels with representative asset thumbnails for the explore page.',
    history: new HistoryBuilder().added('v2.8.0').beta('v2.8.0'),
  })
  getSceneData(@Auth() auth: AuthDto): Promise<SearchExploreResponseDto[]> {
    return this.service.getSceneData(auth);
  }

  @Post('scenes/reclassify')
  @Authenticated({ permission: Permission.QueueJobCreate, admin: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Endpoint({
    summary: 'Reclassify all assets',
    description: 'Queue all assets for scene re-classification.',
    history: new HistoryBuilder().added('v2.8.0').beta('v2.8.0'),
  })
  reclassifyAllScenes(@Auth() auth: AuthDto): Promise<void> {
    return this.service.triggerReclassification(auth);
  }
}
