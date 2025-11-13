import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Loader2, Upload, X, Edit, Trash2 } from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditKioskHighlight = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth0();
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDuration, setSlideDuration] = useState(45);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Text images state
  const [textImages, setTextImages] = useState([]);
  const [showTextImageForm, setShowTextImageForm] = useState(false);
  const [editingTextImage, setEditingTextImage] = useState(null);
  const [textImageFormData, setTextImageFormData] = useState({
    text: "",
    image: null,
    image_preview: null,
    qrimage: null,
    qrimage_preview: null,
    display_order: 0,
  });

  const API_BASE_URL = "https://njs-01.optimuslab.space";

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };
  
  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link'
  ];

  // Fetch slides and duration from API
  useEffect(() => {
    fetchSlides();
    fetchTextImages();
  }, []);

  // Auto-advance slides based on duration
  useEffect(() => {
    if (slides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, slideDuration * 1000);

    return () => clearInterval(interval);
  }, [slides.length, slideDuration]);

  const fetchTextImages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/library_facilities/text_images`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Sort by display_order
      const sortedData = [...(data.data || [])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setTextImages(sortedData);
    } catch (err) {
      console.error("Error fetching text images:", err);
      setError(`Failed to fetch text images: ${err.message}`);
    }
  };

  const fetchSlides = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/library_facilities/text_images`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data.data)) {
        // Sort by display_order
        const sortedData = [...data.data].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setSlides(sortedData);
        setSlideDuration(data.second || 45);
      }
    } catch (error) {
      console.error("Error fetching slides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update slide duration via API
  const updateSlideDuration = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/library_facilities/text_images/second`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ second: parseInt(slideDuration) })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update duration: ${response.status}`);
      }
      
      setSuccessMessage('Slide duration updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error updating slide duration:", error);
      setError('Error updating slide duration. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to previous slide
  const previousSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  // Navigate to next slide
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  // Parse HTML text to display
  const parseHtmlText = (htmlString) => {
    const div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.textContent || div.innerText || '';
  };

  // Text image management functions
  const handleTextImageAdd = () => {
    setShowTextImageForm(true);
    setEditingTextImage(null);
    setTextImageFormData({
      text: "",
      image: null,
      image_preview: null,
      qrimage: null,
      qrimage_preview: null,
      display_order: 0,
    });
  };

  const handleTextImageEdit = (item) => {
    setEditingTextImage(item);
    setShowTextImageForm(true);
    setTextImageFormData({
      text: item.text || "",
      image: null,
      image_preview: item.image || null,
      qrimage: null,
    qrimage_preview: item.qrimage || null,
      display_order: item.display_order || 0,
    });
  };

  const handleTextImageSave = async () => {
    const textContent = textImageFormData.text.replace(/<[^>]*>/g, '').trim();
    if (!textContent) {    
      setError("Text is required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("text", textImageFormData.text);
      formDataToSend.append("display_order", textImageFormData.display_order || 0);

      
      if (editingTextImage) {
        if (textImageFormData.image instanceof File) {
          formDataToSend.append("image", textImageFormData.image);
        } else if (textImageFormData.image === null && textImageFormData.image_preview === null) {
          formDataToSend.append("remove_image", "true");
        }
      } else {
        if (textImageFormData.image instanceof File) {
          formDataToSend.append("image", textImageFormData.image);
        }
      }

if (editingTextImage) {
    if (textImageFormData.qrimage instanceof File) {
      formDataToSend.append("qrimage", textImageFormData.qrimage);
    } else if (textImageFormData.qrimage === null && textImageFormData.qrimage_preview === null) {
      formDataToSend.append("remove_qrimage", "true");
    }
  } else {
    if (textImageFormData.qrimage instanceof File) {
      formDataToSend.append("qrimage", textImageFormData.qrimage);
    }
  }

      const url = editingTextImage 
        ? `${API_BASE_URL}/library_facilities/text_images/${editingTextImage.id}`
        : `${API_BASE_URL}/library_facilities/text_images`;
      
      const method = editingTextImage ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save: ${response.status} - ${errorText}`);
      }

      setSuccessMessage(editingTextImage ? "Slider updated successfully" : "Slider added successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      setShowTextImageForm(false);
      setEditingTextImage(null);
      setTextImageFormData({
        text: "",
        image: null,
        image_preview: null,
      });
      await fetchTextImages();
      await fetchSlides();
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleTextImageDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this text image?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/library_facilities/text_images/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      setSuccessMessage("Text image deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      await fetchTextImages();
      await fetchSlides();
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleTextImageCancel = () => {
    setShowTextImageForm(false);
    setEditingTextImage(null);
    setTextImageFormData({
      text: "",
      image: null,
      image_preview: null,
      qrimage: null,
      qrimage_preview: null,
      display_order: 0,
    });
  };
  const handleTextImageInputChange = (field, value) => {
    setTextImageFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTextImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTextImageFormData(prev => ({
        ...prev,
        image: file,
        image_preview: previewUrl,
      }));
    }
  };

  const handleTextImageRemove = () => {
    setTextImageFormData(prev => ({
      ...prev,
      image: null,
      image_preview: null,
    }));
  };

  const handleQRImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTextImageFormData(prev => ({
        ...prev,
        qrimage: file,
        qrimage_preview: previewUrl,
      }));
    }
  };
  
  const handleQRImageRemove = () => {
    setTextImageFormData(prev => ({
      ...prev,
      qrimage: null,
      qrimage_preview: null,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        logout={logout}
      />

      {/* Header */}
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showWeatherData={true}
        showLiveCount={true}
      />

      {/* Main Content */}
      <main className="pt-28 xl:pt-32 px-4 md:px-8 pb-10">
        <div className="max-w-full mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Kiosk Highlight</h1>
            <p className="text-gray-600">Manage slide duration and preview kiosk highlights</p>
          </div>

          {/* Notification Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
              <p>{successMessage}</p>
            </div>
          )}

          {/* Slide Duration Control */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Slide Duration Control</h2>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration per slide (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={updateSlideDuration}
                disabled={isSaving}
                className="mt-6 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-6 py-2 rounded-md flex items-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Duration
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Image Slider Section */}
          <div className="mt-12 border-t pt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Highlights</h2>
              <button
                onClick={handleTextImageAdd}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-1 rounded-md shadow-sm font-medium"
              >
                <span className="text-lg">+</span> Add
              </button>
            </div>

            {/* Add/Edit Form */}
            {showTextImageForm && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {editingTextImage ? "Edit Text Image" : "Add New Text Image"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-300 rounded-md">
                      <ReactQuill
                        theme="snow"
                        value={textImageFormData.text}
                        onChange={(value) => handleTextImageInputChange("text", value)}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Enter text description... You can add links and formatting."
                        style={{ minHeight: '120px' }}
                      />
                    </div>
                  </div>

                  <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Order <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          value={textImageFormData.display_order || 0}
          onChange={(e) => handleTextImageInputChange("display_order", parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0"
          min="0"
        />
      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center justify-center w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                        <div className="flex flex-col items-center">
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-xs text-gray-500">Upload</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTextImageUpload}
                          className="hidden"
                        />
                      </label>
                      {textImageFormData.image_preview && (
                        <div className="relative">
                          <img
                            src={textImageFormData.image_preview}
                            alt="Preview"
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={handleTextImageRemove}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    QR Image
  </label>
  <div className="flex items-center space-x-4">
    <label className="flex items-center justify-center w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
      <div className="flex flex-col items-center">
        <Upload className="w-6 h-6 text-gray-400" />
        <span className="text-xs text-gray-500">Upload QR</span>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handleQRImageUpload}
        className="hidden"
      />
    </label>
    {textImageFormData.qrimage_preview && (
      <div className="relative">
        <img
          src={textImageFormData.qrimage_preview}
          alt="QR Preview"
          className="w-32 h-20 object-cover rounded-lg"
        />
        <button
          onClick={handleQRImageRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
</div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleTextImageCancel}
                      className="border border-gray-500 px-4 py-2 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTextImageSave}
                      disabled={loading || !textImageFormData.text.trim()}
                      className={`px-4 py-2 rounded-md font-medium ${
                        loading || !textImageFormData.text.trim()
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {loading ? "Saving..." : editingTextImage ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Text Images List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {textImages.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  {item.image && (
                    <img
                      src={item.image}
                      alt="Text Image"
                      className="w-full h-52 object-cover rounded-lg mb-3"
                    />
                  )}
                  <div 
                    className="text-sm text-gray-800 mb-3"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                  <p className="text-xs text-gray-500 mb-3">
                    Created: {new Date(item.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleTextImageEdit(item)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTextImageDelete(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {textImages.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No text images found. Add your first text image above.
              </div>
            )}
          </div>

          {/* Image Slider Preview */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Slide Preview {slides.length > 0 && `(${currentSlide + 1} of ${slides.length})`}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading kiosk highlights...</p>
                </div>
              </div>
            ) : slides.length > 0 ? (
              <div className="relative">
                {/* Slide Content */}
                <div className="bg-gray-100 min-h-96 flex flex-col items-center justify-center p-8">
                  {/* Image */}
                  <div className="mb-6 max-w-2xl w-full">
                    <img
                      src={slides[currentSlide].image}
                      alt={`Slide ${currentSlide + 1}`}
                      className="w-full h-auto rounded-lg shadow-lg object-contain max-h-96"
                    />
                  </div>

                  {/* Text Content */}
                  <div className="max-w-2xl w-full text-center">
                    <p className="text-lg text-gray-800">
                      {parseHtmlText(slides[currentSlide].text)}
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                      Created: {new Date(slides[currentSlide].created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <button
                  onClick={previousSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 text-gray-800 p-3 rounded-full shadow-lg transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 text-gray-800 p-3 rounded-full shadow-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Slide Indicators */}
                <div className="flex justify-center gap-2 py-6 bg-white border-t">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentSlide
                          ? 'bg-blue-600 w-8'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                No slides available
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditKioskHighlight;