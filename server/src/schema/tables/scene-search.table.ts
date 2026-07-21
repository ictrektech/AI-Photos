import { Column, ForeignKeyColumn, Index, Table } from '@immich/sql-tools';
import { AssetTable } from 'src/schema/tables/asset.table';

@Table({ name: 'scene_search' })
@Index({ columns: ['sceneLabel'] })
export class SceneSearchTable {
  @ForeignKeyColumn(() => AssetTable, { onDelete: 'CASCADE', primary: true })
  assetId!: string;

  @Column({ type: 'character varying', length: 64, primary: true })
  sceneLabel!: string;

  @Column({ type: 'real' })
  confidence!: number;
}
