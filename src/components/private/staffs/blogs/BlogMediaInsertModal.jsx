import React, { useState } from "react";
import axios from "axios";
import {
  XMarkIcon,
  PhotoIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  ArrowUpTrayIcon,
  LinkIcon,
  CheckCircleIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

export default function BlogMediaInsertModal({
  isOpen,
  onClose,
  onInsert, // receives html string to insert at cursor
  initialType = "image",
  apiBaseUrl,
  authHeaders
}) {
  const [mediaType, setMediaType] = useState(initialType); // "image" | "audio" | "video"
  const [sourceMode, setSourceMode] = useState("upload"); // "upload" | "url"

  // Sync initialType when modal opens
  React.useEffect(() => {
    if (isOpen && initialType) {
      setMediaType(initialType);
    }
  }, [isOpen, initialType]);

  // Form states
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [titleOrCaption, setTitleOrCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Convert YouTube/Vimeo URLs to embeddable URLs
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    const url = rawUrl.trim();

    // YouTube matches
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }

    // Vimeo matches
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSelectedFile(file);
    if (!titleOrCaption) {
      setTitleOrCaption(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    let finalUrl = mediaUrl.trim();

    // If uploading a file, post to media upload API
    if (sourceMode === "upload") {
      if (!selectedFile) {
        setError("Please choose a media file to upload.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("type", mediaType);

        const res = await axios.post(`${apiBaseUrl}/api/staffs/blogs/media/upload`, formData, {
          headers: {
            ...authHeaders,
            "Content-Type": "multipart/form-data",
          },
        });

        finalUrl = res.data?.url;
        if (!finalUrl) throw new Error("Server did not return a valid media URL.");
      } catch (err) {
        console.error("Media upload error:", err);
        setError(err.response?.data?.message || "Failed to upload media file.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    if (!finalUrl) {
      setError("Please provide a valid file or URL.");
      return;
    }

    // If finalUrl is relative (e.g. /storage/...), resolve to full backend URL
    if (finalUrl.startsWith("/")) {
      const base = (apiBaseUrl || process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test").replace(/\/+$/, "");
      finalUrl = `${base}${finalUrl}`;
    }

    // Generate responsive HTML snippet based on mediaType
    let snippet = "";
    const cleanTitle = titleOrCaption.trim();

    if (mediaType === "image") {
      snippet = `
        <figure class="my-6 text-center">
          <img src="${finalUrl}" alt="${cleanTitle || 'Blog Image'}" class="rounded-2xl max-w-full mx-auto shadow-md" style="max-height: 540px; object-fit: contain;" />
          ${cleanTitle ? `<figcaption class="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium italic">${cleanTitle}</figcaption>` : ''}
        </figure>
        <p><br></p>
      `;
    } else if (mediaType === "audio") {
      snippet = `
        <div class="my-6 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 max-w-xl mx-auto shadow-sm space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-[#0F2843] dark:text-[#C5A97A]">
            <span>🎵 Audio Clip:</span>
            <span class="text-gray-800 dark:text-gray-200">${cleanTitle || 'Audio Track'}</span>
          </div>
          <audio controls src="${finalUrl}" class="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
        <p><br></p>
      `;
    } else if (mediaType === "video") {
      const embedUrl = getEmbedUrl(finalUrl);
      if (embedUrl) {
        // Responsive video iframe embed
        snippet = `
          <div class="my-6 aspect-video rounded-2xl overflow-hidden shadow-xl max-w-3xl mx-auto bg-black">
            <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          ${cleanTitle ? `<p class="text-xs text-center text-gray-500 dark:text-gray-400 -mt-4 mb-6 font-medium italic">${cleanTitle}</p>` : ''}
          <p><br></p>
        `;
      } else {
        // Native HTML5 video player
        snippet = `
          <div class="my-6 rounded-2xl overflow-hidden shadow-xl max-w-3xl mx-auto bg-black text-center">
            <video controls src="${finalUrl}" class="w-full max-h-[500px] rounded-2xl">
              <source src="${finalUrl}">
              Your browser does not support the video tag.
            </video>
          </div>
          ${cleanTitle ? `<p class="text-xs text-center text-gray-500 dark:text-gray-400 -mt-4 mb-6 font-medium italic">${cleanTitle}</p>` : ''}
          <p><br></p>
        `;
      }
    }

    if (onInsert) {
      onInsert(snippet);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setMediaUrl("");
    setTitleOrCaption("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#09314F] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-[#0F2843] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#C5A97A]">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Insert Rich Media</h3>
              <p className="text-xs text-gray-300 font-medium">Embed photos, audio recordings, or videos into your article</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Media Type Tabs */}
        <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 flex items-center justify-center gap-2">
          {[
            { id: "image", label: "Image / Diagram", icon: PhotoIcon },
            { id: "audio", label: "Audio Podcast", icon: MusicalNoteIcon },
            { id: "video", label: "Video Player", icon: VideoCameraIcon },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = mediaType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMediaType(tab.id);
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Source Mode Toggle (Upload vs URL) */}
        <div className="px-6 pt-4 flex items-center gap-4 text-xs font-bold text-gray-600 dark:text-gray-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sourceMode"
              checked={sourceMode === "upload"}
              onChange={() => setSourceMode("upload")}
              className="text-[#0F2843] focus:ring-[#0F2843]"
            />
            <span className="flex items-center gap-1">
              <ArrowUpTrayIcon className="w-3.5 h-3.5" />
              Upload from Device
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sourceMode"
              checked={sourceMode === "url"}
              onChange={() => setSourceMode("url")}
              className="text-[#0F2843] focus:ring-[#0F2843]"
            />
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" />
              Paste Web / Cloud URL
            </span>
          </label>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {sourceMode === "upload" ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Choose {mediaType === "image" ? "Image (JPG, PNG, WEBP)" : mediaType === "audio" ? "Audio (MP3, WAV, M4A)" : "Video (MP4, WEBM)"}
              </label>
              <input
                type="file"
                accept={
                  mediaType === "image"
                    ? "image/png,image/jpeg,image/webp,image/svg+xml"
                    : mediaType === "audio"
                    ? "audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac"
                    : "video/mp4,video/webm,video/ogg"
                }
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#0F2843] file:text-white dark:file:bg-[#C5A97A] dark:file:text-[#0F2843] hover:file:opacity-90 cursor-pointer border border-gray-200 dark:border-white/10 rounded-2xl p-2 bg-gray-50 dark:bg-white/5"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                {mediaType === "video" ? "Video URL (YouTube, Vimeo, MP4 link)" : `${mediaType.toUpperCase()} URL`}
              </label>
              <input
                type="url"
                placeholder={mediaType === "video" ? "https://www.youtube.com/watch?v=..." : "https://example.com/media-file..."}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              {mediaType === "image" ? "Caption / Alt Description (Optional)" : "Title / Label (Optional)"}
            </label>
            <input
              type="text"
              placeholder={mediaType === "image" ? "e.g. Figure 1: Diagram of organic synthesis" : "e.g. Episode 3: Physics audio explanation"}
              value={titleOrCaption}
              onChange={(e) => setTitleOrCaption(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white outline-none"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-lg hover:opacity-95 transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Uploading Media...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Insert into Content</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
