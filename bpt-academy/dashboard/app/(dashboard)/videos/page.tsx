'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { X, Play, Bookmark, MessageCircle, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface Video {
  id: string
  title: string
  description: string | null
  mux_playback_id: string | null
  thumbnail_url: string | null
  program_id: string | null
  program_title?: string
  uploaded_by: string | null
  uploader_name?: string
  created_at: string
  bookmark_count?: number
  comment_count?: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_name: string
}

interface Program {
  id: string
  title: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [programFilter, setProgramFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchVideos()
    fetchPrograms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programFilter])

  async function fetchPrograms() {
    const supabase = createClient()
    const { data } = await supabase.from('programs').select('id, title').order('title')
    setPrograms(data || [])
  }

  async function fetchVideos() {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (programFilter) {
      query = query.eq('program_id', programFilter)
    }

    const { data } = await query

    if (data) {
      const enriched = await Promise.all(
        data.map(async (v: Video) => {
          // Get program title
          let program_title = 'No Program'
          if (v.program_id) {
            const { data: prog } = await supabase
              .from('programs')
              .select('title')
              .eq('id', v.program_id)
              .single()
            program_title = prog?.title || 'Unknown'
          }

          // Uploader name
          let uploader_name = 'Unknown'
          if (v.uploaded_by) {
            const { data: uploader } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', v.uploaded_by)
              .single()
            uploader_name = uploader?.full_name || 'Unknown'
          }

          // Counts
          const { count: bookmark_count } = await supabase
            .from('video_bookmarks')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', v.id)

          const { count: comment_count } = await supabase
            .from('video_comments')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', v.id)

          return {
            ...v,
            program_title,
            uploader_name,
            bookmark_count: bookmark_count || 0,
            comment_count: comment_count || 0,
          }
        })
      )
      setVideos(enriched)
    }

    setLoading(false)
  }

  async function loadComments(video: Video) {
    setSelectedVideo(video)
    const supabase = createClient()

    const { data } = await supabase
      .from('video_comments')
      .select('*')
      .eq('video_id', video.id)
      .order('created_at', { ascending: false })

    if (data) {
      const enriched = await Promise.all(
        data.map(async (c: { id: string; content: string; created_at: string; user_id: string }) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', c.user_id)
            .single()
          return {
            id: c.id,
            content: c.content,
            created_at: c.created_at,
            user_name: profile?.full_name || 'Unknown',
          }
        })
      )
      setComments(enriched)
    }
  }

  async function deleteVideo(videoId: string) {
    setDeleting(true)
    const supabase = createClient()

    // Delete related records
    await supabase.from('video_bookmarks').delete().eq('video_id', videoId)
    await supabase.from('video_comments').delete().eq('video_id', videoId)
    await supabase.from('videos').delete().eq('id', videoId)

    setDeleting(false)
    setSelectedVideo(null)
    fetchVideos()
  }

  function getThumbnailUrl(video: Video): string {
    if (video.thumbnail_url) return video.thumbnail_url
    if (video.mux_playback_id) {
      return `https://image.mux.com/${video.mux_playback_id}/thumbnail.png`
    }
    return ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage coaching video library
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Videos grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No videos found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => {
            const thumbUrl = getThumbnailUrl(video)
            return (
              <div
                key={video.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => loadComments(video)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative">
                  {thumbUrl ? (
                    <Image
                      src={thumbUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={32} className="text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Play
                      size={40}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate text-sm">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">
                      {video.program_title}
                    </span>
                    <div className="flex items-center gap-3 text-gray-400">
                      <span className="flex items-center gap-1 text-xs">
                        <Bookmark size={12} />
                        {video.bookmark_count}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <MessageCircle size={12} />
                        {video.comment_count}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    {formatDate(video.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedVideo.title}
              </h2>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Thumbnail */}
            {getThumbnailUrl(selectedVideo) && (
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-4 relative">
                <Image
                  src={getThumbnailUrl(selectedVideo)}
                  alt={selectedVideo.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {selectedVideo.description && (
              <p className="text-sm text-gray-600 mb-4">
                {selectedVideo.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span>Program: {selectedVideo.program_title}</span>
              <span>Uploaded by: {selectedVideo.uploader_name}</span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Bookmark size={16} />
                {selectedVideo.bookmark_count} bookmarks
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <MessageCircle size={16} />
                {selectedVideo.comment_count} comments
              </span>
            </div>

            {/* Comments */}
            {comments.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Comments
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700">
                        {c.user_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{c.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedVideo(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to delete this video? This cannot be undone.'
                    )
                  ) {
                    deleteVideo(selectedVideo.id)
                  }
                }}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-medium"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
