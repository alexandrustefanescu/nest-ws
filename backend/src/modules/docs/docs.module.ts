import { Module } from '@nestjs/common';
import { WsDocsController } from './ws-docs.controller';

@Module({ controllers: [WsDocsController] })
export class DocsModule {}
