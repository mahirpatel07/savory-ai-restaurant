import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  Sparkles,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  RotateCcw,
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCw,
  Star,
  CheckCircle2,
  PauseCircle,
  Utensils,
  Tag,
  Flame,
  Layers,
  Sparkle
} from 'lucide-react'
import axios from 'axios'
import { categories, getCategoryImage } from '../../utils/menuData'
import { getSocket } from '../../utils/socket'
import { useTheme } from '../../context/ThemeContext'
import toast, { Toaster } from 'react-hot-toast'

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const rotRad = (rotation * Math.PI) / 180;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotRad);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve({
        file,
        url: URL.createObjectURL(file),
      });
    }, 'image/jpeg');
  });
}

async function getEditedImg(imageSrc, rotation = 0, zoom = 1) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(zoom, zoom);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve({
        file,
        url: URL.createObjectURL(file),
      });
    }, 'image/jpeg');
  });
}

export default function MenuManagement() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Edit State
  const [editState, setEditState] = useState({
    rotation: 0,
    zoom: 1,
  })

  // Crop State
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 })
  const containerRef = useRef(null)

  const handleCropSave = async () => {
    if (!newDish.imagePreview) return

    const img = await createImage(newDish.imagePreview)
    const pixelCrop = {
      x: (cropArea.x / 100) * img.width,
      y: (cropArea.y / 100) * img.height,
      width: (cropArea.width / 100) * img.width,
      height: (cropArea.height / 100) * img.height,
    }

    const { file, url } = await getCroppedImg(newDish.imagePreview, pixelCrop)
    const croppedFile = new File([file], 'cropped-dish.jpg', { type: 'image/jpeg' })
    setNewDish(prev => ({
      ...prev,
      image: croppedFile,
      imagePreview: url
    }))
    setCropModalOpen(false)
    toast.success('Image cropped')
  }

  const handleEditSave = async () => {
    if (!newDish.imagePreview) return
    const { file, url } = await getEditedImg(newDish.imagePreview, editState.rotation, editState.zoom)
    const editedFile = new File([file], 'edited-dish.jpg', { type: 'image/jpeg' })
    setNewDish(prev => ({
      ...prev,
      image: editedFile,
      imagePreview: url
    }))
    setEditModalOpen(false)
    toast.success('Image updated')
  }

  const resetEdit = () => {
    setEditState({ rotation: 0, zoom: 1 })
  }

  // New Dish Form State
  const [newDish, setNewDish] = useState({
    name: '',
    price: '',
    description: '',
    category: categories[1]?.id || 'pizza',
    image: null,
    imagePreview: null
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchMenu()

    const socket = getSocket()
    if (socket) {
      socket.emit('join-admin')
      socket.on('dish_created', (dish) => {
        setItems(prev => [dish, ...prev])
      })
    }

    return () => {
      if (socket) {
        socket.off('dish_created')
      }
    }
  }, [])

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/menu`)
      setItems(response.data)
    } catch (error) {
      console.error('Error fetching menu:', error)
      toast.error('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Only PNG, JPG and WEBP are supported')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }

      setNewDish(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }))
    }
  }

  const removeImage = () => {
    setNewDish(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!newDish.name || !newDish.price || !newDish.description || !newDish.image) {
      toast.error('Please fill all fields and upload an image')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('name', newDish.name)
    formData.append('price', newDish.price)
    formData.append('description', newDish.description)
    formData.append('category', newDish.category)
    formData.append('image', newDish.image)

    try {
      await axios.post(`${API_BASE}/api/menu`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Dish published successfully!')
      setModalOpen(false)
      setNewDish({
        name: '',
        price: '',
        description: '',
        category: categories[1]?.id || 'pizza',
        image: null,
        imagePreview: null
      })
    } catch (error) {
      console.error('Error publishing dish:', error)
      toast.error(error.response?.data?.message || 'Failed to publish dish')
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableCount = items.filter((item) => item.available).length
  const pausedCount = items.filter((item) => !item.available).length

  const toggleAvailable = async (id) => {
    try {
      const storedUser = localStorage.getItem('savory_user');
      const token = storedUser ? JSON.parse(storedUser).token : localStorage.getItem('token');
      const res = await axios.patch(`${API_BASE}/api/menu/${id}/toggle`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setItems((current) => current.map((it) => (it._id === id ? res.data : it)));
      toast.success(`Item ${res.data.available ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      toast.error('Failed to update item status');
    }
  }

  const filteredItems = items.filter((it) => {
    const matchesCategory = activeCategory === 'all' || it.category === activeCategory
    const matchesSearch = it.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  return (
    <div className="space-y-6 font-sans pb-16">
      <Toaster position="top-right" />

      {/* ── TOP CONTROL & STATS HEADER ── */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 sm:p-8 rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-2xl shadow-2xl`}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500">
              <Sparkles size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
              Culinary Catalog Management
            </span>
          </div>
          <h1 className={`text-3xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight leading-none`}>
            Menu Management
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-gray-600'} font-medium mt-2 max-w-xl leading-relaxed`}>
            Configure restaurant offerings, spotlight signature dishes, and toggle live item availability in real-time.
          </p>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {availableCount} Active Dishes
            </span>
            <span className="px-3.5 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {pausedCount} Paused / Sold Out
            </span>
            <span className={`px-3.5 py-1.5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60' : 'border-gray-200 bg-gray-100 text-gray-700'} text-xs font-bold`}>
              {items.length} Total Registered
            </span>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer flex-shrink-0"
        >
          <Plus size={18} />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 backdrop-blur-2xl shadow-xl space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes by name..."
              className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50 transition-all`}
            />
            {search && (
              <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reset button */}
          {(search || activeCategory !== 'all') && (
            <button
              onClick={() => { setSearch(''); setActiveCategory('all') }}
              className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 transition-all"
            >
              <RotateCcw size={14} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pt-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap h-10 px-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center justify-center ${
              activeCategory === 'all'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : isDark ? 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <span>All Categories ({items.length})</span>
          </button>
          {categories.slice(1).map((category) => {
            const count = items.filter(i => i.category === category.id).length;
            const catImg = category.image || getCategoryImage(category.id, items);
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`whitespace-nowrap h-10 px-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center justify-center gap-2.5 ${
                  activeCategory === category.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : isDark ? 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {catImg && (
                  <img
                    src={catImg}
                    alt={category.name}
                    className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                  />
                )}
                <span>{category.name} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DISH CARDS GRID ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Loading Menu Catalog...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={`col-span-full rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215] text-white/40' : 'border-gray-200 bg-white text-gray-600 shadow-md'} p-16 text-center text-xs font-bold`}>
            No dishes match your selection.
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const categoryName = categories.find(c => c.id === item.category)?.name || item.category;

            return (
              <motion.article
                key={item._id || item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.02 * index }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border p-3 transition-all duration-300 ${
                  item.available
                    ? isDark ? 'border-white/10 bg-[#121215] text-white hover:border-orange-500/40 hover:bg-[#161619]' : 'border-gray-200 bg-white text-gray-900 shadow-md hover:border-orange-500/40'
                    : 'border-rose-500/20 bg-rose-950/10 opacity-70'
                }`}
              >
                {/* Image Banner */}
                <div className="relative h-36 w-full overflow-hidden rounded-2xl bg-zinc-900">
                  <img
                    src={item.image?.startsWith('http') ? item.image : `${API_BASE}${item.image}`}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Category Badge Top Left */}
                  <div className="absolute left-2 top-2 rounded-lg border border-white/10 bg-black/70 backdrop-blur-md px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-400">
                    {categoryName}
                  </div>

                  {/* Rating Badge Top Right */}
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-amber-500/20 bg-black/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-amber-400">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span>{item.rating || 5.0}</span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="flex-1 flex flex-col justify-between pt-2.5">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight leading-snug group-hover:text-orange-500 transition-colors truncate`}>
                        {item.name}
                      </h3>
                      <span className="text-xs font-black text-orange-500 flex-shrink-0">${item.price}</span>
                    </div>

                    <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-600'} line-clamp-1 leading-normal mb-2`}>
                      {item.description}
                    </p>
                  </div>

                  {/* Toggle Action Footer */}
                  <div className={`pt-2 border-t ${isDark ? 'border-white/5' : 'border-gray-200'} flex items-center justify-between`}>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      item.available ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {item.available ? '● Active' : '● Paused'}
                    </span>

                    <button
                      onClick={() => toggleAvailable(item._id || item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                        item.available
                          ? isDark ? 'border border-white/10 bg-white/5 text-white/60 hover:bg-rose-500 hover:text-white hover:border-rose-500' : 'border border-gray-200 bg-gray-100 text-gray-700 hover:bg-rose-500 hover:text-white'
                          : 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black'
                      }`}
                    >
                      {item.available ? 'Pause' : 'Enable'}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {/* ── ADD DISH MODAL ── */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          <AnimatePresence>
            {modalOpen && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setModalOpen(false)}
                  className="fixed inset-0 bg-black/85 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  style={{ maxHeight: '90vh' }}
                  className={`relative w-full max-w-lg overflow-hidden rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} shadow-[0_30px_100px_rgba(249,115,22,0.15)] flex flex-col z-[10001]`}
                >
                  <div className={`flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray-200'} p-6 flex-none`}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">New Dish Draft</p>
                      <h2 className={`mt-0.5 text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>Add Dish to Menu</h2>
                    </div>
                    <button onClick={() => setModalOpen(false)} className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'} p-2 transition`}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0 text-xs">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Dish Image</label>
                        {!newDish.imagePreview ? (
                          <div
                            onClick={() => fileInputRef.current.click()}
                            className={`group relative aspect-video cursor-pointer flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed ${isDark ? 'border-white/15 bg-black/40 text-white/40' : 'border-gray-300 bg-gray-50 text-gray-500'} transition hover:border-orange-500/50`}
                          >
                            <div className="flex flex-col items-center gap-2 group-hover:text-orange-500">
                              <div className={`rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-200'} p-3`}>
                                <Upload size={22} />
                              </div>
                              <span className="text-xs font-bold">Upload High-Res Dish Image</span>
                              <span className="text-[9px]">PNG, JPG or WEBP (max 5MB)</span>
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageChange}
                              className="hidden"
                              accept="image/*"
                            />
                          </div>
                        ) : (
                          <div className={`group relative aspect-video overflow-hidden rounded-[24px] border ${isDark ? 'border-white/15' : 'border-gray-200'}`}>
                            <img src={newDish.imagePreview} alt="Preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 backdrop-blur-sm">
                              <div className="flex gap-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCropModalOpen(true); }}
                                  className="rounded-2xl bg-black/60 p-2.5 text-white hover:bg-black transition-all border border-white/20"
                                  title="Crop Image"
                                >
                                  <Crop size={18} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditModalOpen(true); }}
                                  className="rounded-2xl bg-black/60 p-2.5 text-white hover:bg-black transition-all border border-white/20"
                                  title="Edit Image"
                                >
                                  <ImageIcon size={18} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeImage(); }}
                                  className="rounded-2xl bg-black/60 p-2.5 text-rose-500 hover:bg-rose-500/30 transition-all border border-rose-500/20"
                                  title="Remove Image"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageChange}
                              className="hidden"
                              accept="image/*"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>Dish Name</label>
                          <input
                            value={newDish.name}
                            onChange={(e) => setNewDish(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Truffle Pasta"
                            className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} px-4 py-3 text-xs outline-none focus:border-orange-500 transition`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1.5 block">Price ($)</label>
                          <input
                            type="number"
                            value={newDish.price}
                            onChange={(e) => setNewDish(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="28.00"
                            className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-orange-400' : 'border-gray-200 bg-gray-50 text-orange-600'} px-4 py-3 text-xs font-bold outline-none focus:border-orange-500 transition`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>Category</label>
                        <select
                          value={newDish.category}
                          onChange={(e) => setNewDish(prev => ({ ...prev, category: e.target.value }))}
                          className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} px-4 py-3 text-xs outline-none focus:border-orange-500 transition appearance-none`}
                        >
                          {categories.slice(1).map(cat => (
                            <option key={cat.id} value={cat.id} className={isDark ? 'bg-[#101013] text-white' : 'bg-white text-gray-900'}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>Description</label>
                        <textarea
                          value={newDish.description}
                          onChange={(e) => setNewDish(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe flavors, ingredients and tableside preparation..."
                          rows={4}
                          className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} px-4 py-3 text-xs outline-none focus:border-orange-500 transition resize-none`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`border-t ${isDark ? 'border-white/10 bg-[#0e0e11]' : 'border-gray-200 bg-gray-50'} p-6 flex justify-end gap-3 flex-none`}>
                    <button
                      disabled={isSubmitting}
                      onClick={() => setModalOpen(false)}
                      className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'} px-6 py-3 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50`}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/20 hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-black" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Publish Dish</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  )
}
