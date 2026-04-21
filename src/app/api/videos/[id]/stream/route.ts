export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { videoStore } from '@/lib/server/composition'
import { getDataDir } from '@/lib/data-dir'

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = videoStore.getById(id)

    if (!video || !video.local_video_path) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const filePath = path.isAbsolute(video.local_video_path)
      ? video.local_video_path
      : path.join(getDataDir(), video.local_video_path)

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const ext = path.extname(filePath).slice(1).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
    const fileSize = fs.statSync(filePath).size

    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1
      const chunkSize = end - start + 1

      const nodeStream = fs.createReadStream(filePath, { start, end })
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) =>
            controller.enqueue(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
          )
          nodeStream.on('end', () => controller.close())
          nodeStream.on('error', (err) => controller.error(err))
        },
      })

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      })
    }

    const nodeStream = fs.createReadStream(filePath)
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) =>
          controller.enqueue(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
        )
        nodeStream.on('end', () => controller.close())
        nodeStream.on('error', (err) => controller.error(err))
      },
    })

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('GET video stream error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
