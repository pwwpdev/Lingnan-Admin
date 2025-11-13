import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Sidebar from "./Sidebar";
import { Trash2, ChevronUp, ChevronDown, Upload, X, Edit, Plus } from "lucide-react";import Header from "./Header";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditFacilities = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState({});
  const [addingLevelTo, setAddingLevelTo] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  

const [editingTextImage, setEditingTextImage] = useState(null);
const [textImageFormData, setTextImageFormData] = useState({
  text: "",
  image: null,
  image_preview: null,
});

// Add new state for lazy-loaded children
const [loadedChildren, setLoadedChildren] = useState({}); // Track which first levels have loaded children
const [loadingChildren, setLoadingChildren] = useState({}); // Track loading state per first level



  const API_BASE_URL =
  "https://facility-search-dot-optimus-lnu.df.r.appspot.com"; 

  const [facilitiesData, setFacilitiesData] = useState([]);
  const [entityOptions, setEntityOptions] = useState([]);
  const [idLookupMap, setIdLookupMap] = useState({});

  const [formData, setFormData] = useState({
    entity_name: "",
    first_level_name: "",
    first_level_query_id: "",
    second_level_name: "",
    second_level_query_id: "",
    third_level_name: "",
    third_level_query_id: "",
    description: "",
    image: null,
    image_preview: null,
    section_title_l2: "", 
  section_title_l3: "", 
  l1_order: "",
  l2_order: "", 
  l3_order: "",
  });



// ADD THESE TWO NEW LINES for third levels
const [loadedThirdLevels, setLoadedThirdLevels] = useState({}); // Track which second levels have loaded third levels
const [loadingThirdLevels, setLoadingThirdLevels] = useState({}); // Track loading state per second level

  //  extract unique entity names for dropdown
  const extractEntityOptions = (facilities) => {
    const uniqueEntities = [
      ...new Set(
        facilities
          .map((f) => f.entity_name)
          .filter((name) => name && name.trim() !== "")
      ),
    ];
    return uniqueEntities.sort();
  };

  const fetchFacilities = async () => {
    console.log("🔍 Fetching from:", `${API_BASE_URL}/api/library_facilities`);
    setLoading(true);
    setError(null);
  
    try {
      const response = await fetch(`${API_BASE_URL}/api/library_facilities`);
  
      console.log("Response status:", response.status);
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("Raw API response:", data);
      
      const sortedFacilities = data.data?.sort(  
        (a, b) => (a.l1_order || 0) - (b.l1_order || 0)
      );
  
      console.log("Sorted facilities:", sortedFacilities);
  
      setFacilitiesData(sortedFacilities || []);
      setEntityOptions(extractEntityOptions(sortedFacilities || []));
    } catch (err) {
      console.error("Error fetching facilities:", err);
      setError(`Failed to fetch facilities: ${err.message}`);
      setFacilitiesData([]);
      setEntityOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch second + third levels on demand
  const fetchChildren = async (firstLevelId) => {
    if (loadedChildren[firstLevelId]) {
      return;
    }
  
    setLoadingChildren(prev => ({ ...prev, [firstLevelId]: true }));
  
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/library_facilities/${firstLevelId}/second_levels`  // ADD /api/
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
  
      setFacilitiesData(prevData =>
        prevData.map(firstLevel => {
          if (firstLevel.id === firstLevelId) {
            return {
              ...firstLevel,
              second_levels: data.second_levels || []
            };
          }
          return firstLevel;
        })
      );
  
      setLoadedChildren(prev => ({ ...prev, [firstLevelId]: true }));
    } catch (err) {
      console.error("Error fetching children:", err);
      setError(`Failed to fetch children: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoadingChildren(prev => ({ ...prev, [firstLevelId]: false }));
    }
  };

  // NEW FUNCTION - Fetch third levels on demand
  const fetchThirdLevels = async (firstLevelId, secondLevelId) => {
    const key = `${firstLevelId}-${secondLevelId}`;
    
    if (loadedThirdLevels[key]) {
      return;
    }
  
    setLoadingThirdLevels(prev => ({ ...prev, [key]: true }));
  
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/library_facilities/${firstLevelId}/second_levels/${secondLevelId}/third_levels`  // ADD /api/
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
  
      setFacilitiesData(prevData =>
        prevData.map(firstLevel => {
          if (firstLevel.id === firstLevelId) {
            return {
              ...firstLevel,
              second_levels: firstLevel.second_levels?.map(secondLevel => {
                if (secondLevel.id === secondLevelId) {
                  return {
                    ...secondLevel,
                    third_levels: data.third_levels || []
                  };
                }
                return secondLevel;
              })
            };
          }
          return firstLevel;
        })
      );
  
      setLoadedThirdLevels(prev => ({ ...prev, [key]: true }));
    } catch (err) {
      console.error("Error fetching third levels:", err);
      setError(`Failed to fetch third levels: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoadingThirdLevels(prev => ({ ...prev, [key]: false }));
    }
  };

  // load data on mount
  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      autoExpandSearchResults(facilitiesData, searchTerm);  // Change filteredData to facilitiesData
    } else {
      setExpandedItems({});
    }
  }, [searchTerm, facilitiesData]);  // Add facilitiesData to dependencies

  const handleEdit = (row) => {
    setEditingRow(row.id);
    setFormData({
      entity_name: row.entity_name || "",
      first_level_name: row.first_level_name || "",
      first_level_query_id: row.first_level_query_id || "",
      second_level_name: row.second_level_name || "",
      second_level_query_id: row.second_level_query_id || "",
      third_level_name: row.third_level_name || "",
      third_level_query_id: row.third_level_query_id || "",
      description: row.description || "",
      image: null,
      image_preview: row.image || null,
    });
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setFormData({
      entity_name: "",
      first_level_name: "",
      first_level_query_id: "",
      second_level_name: "",
      second_level_query_id: "",
      third_level_name: "",
      third_level_query_id: "",
      description: "",
      image: null,
      image_preview: null,
    });
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setAddingLevelTo(null);
    setEditingItem(null);
    setFormData({
      entity_name: "",
      first_level_name: "",
      first_level_query_id: "",
      second_level_name: "",
      second_level_query_id: "",
      third_level_name: "",
      third_level_query_id: "",
      description: "",
      image: null,
      image_preview: null,
      section_title_l2: "", 
      section_title_l3: "",
      l1_order: "",      
      l2_order: "",        
      l3_order: "",      
    });
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        image: file,
        image_preview: previewUrl,
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
      image_preview: null,
    }));
  };

  const handleSaveLevel = async () => {
    try {
      setLoading(true);

      const formDataToSend = new FormData();

      // use the original document id from addingLevelTo
      const documentId = addingLevelTo.id;

      console.log("Adding level:", addingLevelTo.level);
      console.log("Document ID:", documentId);
      console.log("Form data:", formData);

      if (addingLevelTo.level === "second") {
        formDataToSend.append("name", formData.entity_name.trim());
        if (formData.query_id)
          formDataToSend.append("query_id", formData.query_id);
        if (formData.description)
          formDataToSend.append("description", formData.description);
        if (formData.image instanceof File)
          formDataToSend.append("Second Level Image", formData.image);
      } else if (addingLevelTo.level === "third") {
        formDataToSend.append("name", formData.entity_name.trim());
        if (formData.query_id)
          formDataToSend.append("query_id", formData.query_id);
        if (formData.description)
          formDataToSend.append("description", formData.description);
        if (formData.image instanceof File)
          formDataToSend.append("Third Level Image", formData.image);
      }

      // log what wre sending
      console.log("FormData being sent:");
      for (let [key, value] of formDataToSend.entries()) {
        console.log(
          `${key}:`,
          value instanceof File ? `File(${value.name})` : value
        );
      }

      let updateUrl;
      if (addingLevelTo.level === "second") {
        updateUrl = `${API_BASE_URL}/api/library_facilities/second_level/${addingLevelTo.id}`;  
      } else if (addingLevelTo.level === "third") {
        updateUrl = `${API_BASE_URL}/api/library_facilities/third_level/${addingLevelTo.id}/${addingLevelTo.secondId}`;  
      }
      console.log("Making UPDATE API call to:", updateUrl);

      const response = await fetch(updateUrl, {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Update failed:", errorText);
        throw new Error(
          `Failed to add level: ${response.status} - ${errorText}`
        );
      }

      const responseData = await response.json();
      console.log("Update response data:", responseData);

      setSuccessMessage(`${addingLevelTo.level} level added successfully`);
      setTimeout(() => setSuccessMessage(""), 3000);
      setAddingLevelTo(null);

      // clear form data
      setFormData({
        entity_name: "",
        query_id: "",
        description: "",
        image: null,
        image_preview: null,
      });

      await fetchFacilities();
    } catch (err) {
      console.error("Save level operation failed:", err);
      setError(`Failed to add level: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log("=== SAVE OPERATION START ===");
  
    // validation for required fields
    if (!formData.first_level_name || !formData.first_level_name.trim()) {
      setError("First level name is required");
      setTimeout(() => setError(null), 3000);
      return;
    }
  
    // determine the last level filled and require its query_id
    let lastLevel = "first";
    let requiredQueryId = "first_level_query_id";
  
    if ((formData.third_level_name || "").trim()) {
      lastLevel = "third";
      requiredQueryId = "third_level_query_id";
    } else if ((formData.second_level_name || "").trim()) {
      lastLevel = "second";
      requiredQueryId = "second_level_query_id";
    }
  
    // validate the required query_id for the last level
    if (!formData[requiredQueryId] || !formData[requiredQueryId].trim()) {
      setError(
        `${
          lastLevel.charAt(0).toUpperCase() + lastLevel.slice(1)
        } level Query ID is required`
      );
      setTimeout(() => setError(null), 3000);
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("=== ADDING MODE ===");
      console.log("Last filled level:", lastLevel);
      console.log("Required query ID field:", requiredQueryId);
  
      const formDataToSend = new FormData();
  
      // Build first level object
      const firstLevelObj = {
        name: formData.first_level_name.trim(),
        query_id: (formData.first_level_query_id || "").trim(),
        description: lastLevel === "first" ? (formData.description || "").trim() : "",
        l1_order: formData.l1_order || 0, 
      };
  
      // Build second levels array
      const secondLevelsArray = [];
      if ((formData.second_level_name || "").trim()) {
        const secondLevelObj = {
          name: formData.second_level_name.trim(),
          query_id: (formData.second_level_query_id || "").trim(),
          section_title_l2: (formData.section_title_l2 || "").trim(), 
          description: lastLevel === "second" ? (formData.description || "").trim() : "",
          l2_order: formData.l2_order || 0,
          third_levels: []
        };
  
        // Add third level if exists
        if ((formData.third_level_name || "").trim()) {
          secondLevelObj.third_levels.push({
            name: formData.third_level_name.trim(),
            query_id: (formData.third_level_query_id || "").trim(),
            section_title_l3: (formData.section_title_l3 || "").trim(), 
            description: lastLevel === "third" ? (formData.description || "").trim() : "",
            l3_order: formData.l3_order || 0,
          });
        }
  
        secondLevelsArray.push(secondLevelObj);
      }
  
      // Send as JSON strings (as expected by backend)
      formDataToSend.append("first_level", JSON.stringify(firstLevelObj));
      formDataToSend.append("second_levels", JSON.stringify(secondLevelsArray));
  
      // Add images with correct field names
      if (lastLevel === "first" && formData.image instanceof File) {
        formDataToSend.append("first_level[image]", formData.image);
      } else if (lastLevel === "second" && formData.image instanceof File) {
        formDataToSend.append("second_levels[0][image]", formData.image);
      } else if (lastLevel === "third" && formData.image instanceof File) {
        formDataToSend.append("second_levels[0][third_levels][0][image]", formData.image);
      }
  
      // log what we are sending
      console.log("FormData being sent:");
      for (let [key, value] of formDataToSend.entries()) {
        console.log(
          `${key}:`,
          value instanceof File ? `File(${value.name})` : value
        );
      }
  
      console.log("INSERT API call");
      const response = await fetch(`${API_BASE_URL}/api/library_facilities/`, {  
        method: "POST",
        body: formDataToSend,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Insert failed:", errorText);
        throw new Error(`Create failed: ${response.status} - ${errorText}`);
      }
  
      const responseData = await response.json();
      console.log("Insert response data:", responseData);
  
      // refresh data
      await fetchFacilities();
      setSuccessMessage("Facility created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
  
      // reset form
      setShowAddForm(false);
      setFormData({
        entity_name: "",
        first_level_name: "",
        first_level_query_id: "",
        second_level_name: "",
        second_level_query_id: "",
        third_level_name: "",
        third_level_query_id: "",
        description: "",
        image: null,
        image_preview: null,
      });
    } catch (err) {
      console.error("Save operation failed:", err);
      setError(`Failed to save: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
      console.log("=== SAVE OPERATION END ===");
    }
    setLoadedChildren({});
  };

  const getLastFilledLevel = () => {
    if ((formData.third_level_name || "").trim()) {
      return "third";
    } else if ((formData.second_level_name || "").trim()) {
      return "second";
    } else {
      return "first";
    }
  };

  const handleDelete = async (data, level) => {
    if (!window.confirm("Are you sure you want to delete this facility?"))
      return;

    console.log("=== DELETE OPERATION ===");
    console.log("Data object:", data);
    console.log("Level:", level);

    if (!data.id) {
      console.error("ERROR: Invalid document ID for delete");
      setError("Invalid document ID - cannot delete");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    try {
      let deleteUrl;

      if (level === "first") {
        deleteUrl = `${API_BASE_URL}/api/library_facilities/first_level/${data.id}`;  
      } else if (level === "second") {
        deleteUrl = `${API_BASE_URL}/api/library_facilities/second_level/${data.firstLevelDocId}/${data.id}`;  
      } else if (level === "third") {
        deleteUrl = `${API_BASE_URL}/api/library_facilities/third_level/${data.firstLevelDocId}/${data.secondLevelId}/${data.id}`;  
      }

      console.log("Making DELETE API call to:", deleteUrl);

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete API Error:", errorText);
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      console.log("Delete successful!");
      await fetchFacilities();
      setSuccessMessage("Deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Delete operation failed:", err);
      setError(`Failed to delete: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
    setLoadedChildren({});
  };







 

  const filterTreeData = (data, searchTerm) => {
    if (!searchTerm.trim()) return data;
  
    const term = searchTerm.toLowerCase();
  
    return data.filter((firstLevel) => {
      const firstLevelMatch = firstLevel.name?.toLowerCase().includes(term);
  
      const filteredSecondLevel = firstLevel.second_levels?.filter(
        (secondLevel) => {
          const secondLevelMatch = secondLevel.name
            ?.toLowerCase()
            .includes(term);
  
          const filteredThirdLevel = secondLevel.third_levels?.filter(
            (thirdLevel) => {
              return (
                thirdLevel.name?.toLowerCase().includes(term) ||
                thirdLevel.query_id?.toLowerCase().includes(term) ||
                thirdLevel.description?.toLowerCase().includes(term)
              );
            }
          ).sort((a, b) => (a.l3_order || 0) - (b.l3_order || 0)); // Add sorting here
  
          if (
            secondLevelMatch ||
            (filteredThirdLevel && filteredThirdLevel.length > 0)
          ) {
            secondLevel.third_levels =
              filteredThirdLevel || secondLevel.third_levels;
            return true;
          }
  
          return false;
        }
      ).sort((a, b) => (a.l2_order || 0) - (b.l2_order || 0)); // Add sorting here
  
      if (
        firstLevelMatch ||
        (filteredSecondLevel && filteredSecondLevel.length > 0)
      ) {
        firstLevel.second_levels =
          filteredSecondLevel || firstLevel.second_levels;
        return true;
      }
  
      return false;
    }).sort((a, b) => (a.l1_order || 0) - (b.l1_order || 0)); // Add sorting here
  };

  const filteredData = filterTreeData(facilitiesData, searchTerm);

  //autoexpand items that contain search matches
  const autoExpandSearchResults = (data, searchTerm) => {
    if (!searchTerm.trim()) return;

    const term = searchTerm.toLowerCase();
    const newExpandedItems = { ...expandedItems };

    data.forEach((firstLevel) => {
      const firstPath = firstLevel.id || firstLevel.name;

      firstLevel.second_levels?.forEach((secondLevel, secondIndex) => {
        const secondPath = `${firstPath}-${secondLevel.name}`;

        const secondLevelMatch = secondLevel.name?.toLowerCase().includes(term);

        const hasMatchingThirdLevel = secondLevel.third_levels?.some(
          (thirdLevel) =>
            thirdLevel.name?.toLowerCase().includes(term) ||
            thirdLevel.query_id?.toLowerCase().includes(term) ||
            thirdLevel.description?.toLowerCase().includes(term)
        );

        if (secondLevelMatch || hasMatchingThirdLevel) {
          newExpandedItems[firstPath] = true;

          if (hasMatchingThirdLevel) {
            newExpandedItems[secondPath] = true;
          }
        }
      });
    });

    setExpandedItems(newExpandedItems);
  };

  // use LOCAL state

  const TreeCard = React.memo(
    ({ data, level, parentPath = "", fetchChildren, loadedChildren, loadingChildren, fetchThirdLevels, loadedThirdLevels, loadingThirdLevels }) => {  // ADD fetchThirdLevels, loadedThirdLevels, loadingThirdLevels
      // LOCAL STATE - prevents re-renders from parent
      const [localFormData, setLocalFormData] = useState({
        entity_name: "",
        query_id: "",
        description: "",
        image: null,
        image_preview: null,
        section_title: "",
        display_order: "", 
      });

      const [isLocalEditing, setIsLocalEditing] = useState(false);
      const [isLocalAddingLevel, setIsLocalAddingLevel] = useState(false);
      const [addingLevelType, setAddingLevelType] = useState(null);

      const currentPath = parentPath
        ? `${parentPath}-${data.id || data.name}`
        : data.id || data.name;

      //  Access parent state through props only when needed
      const isExpanded = expandedItems[currentPath];
      const isEditing = editingItem && editingItem.path === currentPath;
      const isAddingLevel = addingLevelTo && addingLevelTo.id === data.id;

      //  Sync local editing state with parent
      useEffect(() => {
        setIsLocalEditing(isEditing);
        if (isEditing) {
          setLocalFormData({
            entity_name: data.name || "",
            query_id: data.query_id || "",
            description: data.description || "",
            image: null,
            image_preview: data.image || null,
            section_title: data.section_title_l2 || data.section_title_l3 || "", 
            display_order: data.l1_order || data.l2_order || data.l3_order || "", 

          });
        }
      }, [isEditing, data.name, data.query_id, data.description, data.image, data.l1_order, data.l2_order, data.l3_order]); 


      useEffect(() => {
        setIsLocalAddingLevel(isAddingLevel);
        setAddingLevelType(addingLevelTo?.level || null);
        if (isAddingLevel) {
          setLocalFormData({
            entity_name: "",
            query_id: "",
            description: "",
            image: null,
            image_preview: null,
          });
        }
      }, [isAddingLevel, addingLevelTo?.level]);

      //  LOCAL HANDLERS - These don't affect parent state
      const handleLocalInputChange = useCallback((field, value) => {
        setLocalFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      }, []);

      const handleLocalImageUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
          const previewUrl = URL.createObjectURL(file);
          setLocalFormData((prev) => ({
            ...prev,
            image: file,
            image_preview: previewUrl,
          }));
        }
      }, []);

      const handleLocalRemoveImage = useCallback(() => {
        setLocalFormData((prev) => ({
          ...prev,
          image: null,
          image_preview: null,
        }));
      }, []);

     // Check for valid children - for first level, assume has children if no data loaded yet
const hasValidChildren =
  level === "first"
    ? !loadedChildren[data.id] || 
      (data.second_levels?.length > 0 &&
        data.second_levels.some(
          (item) =>
            (item.name && item.name !== "null") ||
            (item.third_levels?.length > 0 &&
              item.third_levels.some(
                (thirdItem) => thirdItem.name && thirdItem.name !== "null"
              ))
        ))
    : level === "second"
    ? !loadedThirdLevels[`${data.firstLevelDocId}-${data.id}`] ||  // ADD THIS CHECK
      (data.third_levels?.length > 0 &&
        data.third_levels.some((item) => item.name && item.name !== "null"))
    : false;

    const toggleExpansion = useCallback(async () => {
      const newExpandedState = !expandedItems[currentPath];
      
      setExpandedItems((prev) => ({
        ...prev,
        [currentPath]: newExpandedState,
      }));
    
      // Fetch children when expanding
      if (level === "first" && newExpandedState && !loadedChildren[data.id]) {
        await fetchChildren(data.id);
      } else if (level === "second" && newExpandedState && !loadedThirdLevels[`${data.firstLevelDocId}-${data.id}`]) {
        // ADD THIS: Fetch third levels when expanding second level
        await fetchThirdLevels(data.firstLevelDocId, data.id);
      }
    }, [currentPath, level, data.id, data.firstLevelDocId, loadedChildren, loadedThirdLevels, expandedItems, fetchChildren, fetchThirdLevels]);

      const handleEdit = useCallback(() => {
        setEditingItem({
          path: currentPath,
          level: level,
          data: { ...data },
        });
      }, [currentPath, level, data]);

      const handleCancelEdit = useCallback(() => {
        setEditingItem(null);
        setIsLocalEditing(false);
        setLocalFormData({
          entity_name: "",
          query_id: "",
          description: "",
          image: null,
          image_preview: null,
        });
      }, []);

      const handleSaveEdit = useCallback(async () => {
        try {
          setLoading(true);
      
          // Update global formData with local form data
          setFormData((prev) => ({
            ...prev,
            entity_name: localFormData.entity_name,
            query_id: localFormData.query_id,
            description: localFormData.description,
            image: localFormData.image,
            image_preview: localFormData.image_preview,
          }));
      
          const formDataToSend = new FormData();
      
          // ADD DEBUG LOGGING HERE
          console.log("=== EDIT DEBUG ===");
          console.log("Level:", level);
          console.log("Local form data:", localFormData);
          console.log("Display order value:", localFormData.display_order);
          console.log("Data object:", data);
      
          if (level === "first") {
            formDataToSend.append("name", localFormData.entity_name);
            if (localFormData.query_id)
              formDataToSend.append("query_id", localFormData.query_id);
            if (localFormData.description)
              formDataToSend.append("description", localFormData.description);

            if (localFormData.image instanceof File) {
              formDataToSend.append("First Level Image", localFormData.image);
            } else if (localFormData.image === null && localFormData.image_preview === null) {
              formDataToSend.append("remove_image", "true");
            }

            if (localFormData.display_order !== "")  // CHANGE THIS CHECK
              formDataToSend.append("l1_order", localFormData.display_order);
          } else if (level === "second") {
            formDataToSend.append("name", localFormData.entity_name);
            if (localFormData.query_id)
              formDataToSend.append("query_id", localFormData.query_id);
            if (localFormData.section_title)
              formDataToSend.append("section_title_l2", localFormData.section_title);
            if (localFormData.description)
              formDataToSend.append("description", localFormData.description);

            if (localFormData.image instanceof File) {
    formDataToSend.append("Second Level Image", localFormData.image);
  } else if (localFormData.image === null && localFormData.image_preview === null) {
    formDataToSend.append("remove_image", "true");
  }
            if (localFormData.display_order !== "")  // CHANGE THIS CHECK
              formDataToSend.append("l2_order", localFormData.display_order);
          } else if (level === "third") {
            formDataToSend.append("name", localFormData.entity_name);
            if (localFormData.query_id)
              formDataToSend.append("query_id", localFormData.query_id);
            if (localFormData.section_title)
              formDataToSend.append("section_title_l3", localFormData.section_title);
            if (localFormData.description)
              formDataToSend.append("description", localFormData.description);
            
            if (localFormData.image instanceof File) {
              formDataToSend.append("Third Level Image", localFormData.image);
            } else if (localFormData.image === null && localFormData.image_preview === null) {
              formDataToSend.append("remove_image", "true");
            }
            
            if (localFormData.display_order !== "")  // CHANGE THIS CHECK
              formDataToSend.append("l3_order", localFormData.display_order);
          }
      
          // ADD MORE DEBUG LOGGING
          console.log("FormData entries:");
          for (let [key, value] of formDataToSend.entries()) {
            console.log(`${key}:`, value instanceof File ? `File(${value.name})` : value);
          }
      
          let editUpdateUrl;
if (level === "first") {
  editUpdateUrl = `${API_BASE_URL}/api/library_facilities/${data.id}`;  
} else if (level === "second") {
  editUpdateUrl = `${API_BASE_URL}/api/library_facilities/second_level/${data.firstLevelDocId}/${data.id}`;  
} else if (level === "third") {
  editUpdateUrl = `${API_BASE_URL}/api/library_facilities/third_level/${data.firstLevelDocId}/${data.secondLevelId}/${data.id}`;  
}
      
          console.log("API URL:", editUpdateUrl);
      
          const response = await fetch(editUpdateUrl, {
            method: "PUT",
            body: formDataToSend,
          });
      
          console.log("Response status:", response.status);
          console.log("Response ok:", response.ok);
      
          if (!response.ok) {
            const errorText = await response.text();
            console.log("Error response:", errorText);
            throw new Error(`Update failed: ${response.status} - ${errorText}`);
          }
      
          const responseData = await response.json();
          console.log("Success response:", responseData);
      
          setSuccessMessage(`${level} level updated successfully`);
          setTimeout(() => setSuccessMessage(""), 3000);
          setEditingItem(null);
          setIsLocalEditing(false);
      
          await fetchFacilities();
        } catch (err) {
          console.error("Edit save error:", err);
          setError(`Failed to update: ${err.message}`);
          setTimeout(() => setError(null), 3000);
        } finally {
          setLoading(false);
        }
        setLoadedChildren({});
      }, [localFormData, level, data, API_BASE_URL]);

      const handleAddLevel = useCallback(() => {
        const nextLevel = level === "first" ? "second" : "third";
        setAddingLevelTo({
          id: level === "first" ? data.id : data.firstLevelDocId,
          secondId: level === "second" ? data.id : null,
          level: nextLevel,
          parentPath: currentPath,
        });
      }, [level, data, currentPath]);

      const handleCancelAddLevel = useCallback(() => {
        setAddingLevelTo(null);
        setIsLocalAddingLevel(false);
        setLocalFormData({
          entity_name: "",
          query_id: "",
          description: "",
          image: null,
          image_preview: null,
        });
      }, []);

      const handleSaveLevel = useCallback(async () => {
        try {
          setLoading(true);

          // Update global formData with local form data
          setFormData((prev) => ({
            ...prev,
            entity_name: localFormData.entity_name,
            query_id: localFormData.query_id,
            description: localFormData.description,
            image: localFormData.image,
            image_preview: localFormData.image_preview,
          }));

          const formDataToSend = new FormData();

          if (addingLevelType === "second") {
            formDataToSend.append("name", localFormData.entity_name.trim());
            if (localFormData.query_id)
              formDataToSend.append("query_id", localFormData.query_id);
            if (localFormData.section_title)
              formDataToSend.append("section_title_l2", localFormData.section_title);
            if (localFormData.description)
              formDataToSend.append("description", localFormData.description);
            if (localFormData.image instanceof File)
              formDataToSend.append("Second Level Image", localFormData.image);
            if (localFormData.display_order)
              formDataToSend.append("l2_order", localFormData.display_order);
          } else if (addingLevelType === "third") {
            formDataToSend.append("name", localFormData.entity_name.trim());
            if (localFormData.query_id)
              formDataToSend.append("query_id", localFormData.query_id);
            if (localFormData.section_title)
              formDataToSend.append("section_title_l3", localFormData.section_title);
            if (localFormData.description)
              formDataToSend.append("description", localFormData.description);
            if (localFormData.image instanceof File)
              formDataToSend.append("Third Level Image", localFormData.image);
            if (localFormData.display_order)
              formDataToSend.append("l3_order", localFormData.display_order);
          }

          let updateUrl;
          if (addingLevelType === "second") {
            updateUrl = `${API_BASE_URL}/api/library_facilities/second_level/${addingLevelTo.id}`;  
          } else if (addingLevelType === "third") {
            updateUrl = `${API_BASE_URL}/api/library_facilities/third_level/${addingLevelTo.id}/${addingLevelTo.secondId}`;  
          }
          const response = await fetch(updateUrl, {
            method: "POST",
            body: formDataToSend,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to add level: ${response.status} - ${errorText}`
            );
          }

          setSuccessMessage(`${addingLevelType} level added successfully`);
          setTimeout(() => setSuccessMessage(""), 3000);
          setAddingLevelTo(null);
          setIsLocalAddingLevel(false);

          await fetchFacilities();
        } catch (err) {
          setError(`Failed to add level: ${err.message}`);
          setTimeout(() => setError(null), 3000);
        } finally {
          setLoading(false);
        }
        setLoadedChildren({});
      }, [localFormData, addingLevelType, addingLevelTo, API_BASE_URL]);

      return (
        <div
          className={`border rounded-lg ${
            level === "first"
              ? "border-blue-200 bg-blue-50"
              : level === "second"
              ? "border-green-200 bg-green-50 ml-6"
              : "border-orange-200 bg-orange-50 ml-12"
          }`}
        >
          <div className="p-4">
            {isLocalEditing ? (
              // 🚀 EDIT FORM WITH LOCAL STATE
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={localFormData.entity_name}
                      onChange={(e) =>
                        handleLocalInputChange("entity_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter name..."
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Query ID
                    </label>
                    <input
                      type="text"
                      value={localFormData.query_id}
                      onChange={(e) =>
                        handleLocalInputChange("query_id", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter query ID..."
                    />
                  </div>

                  <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Order <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
  type="number"
  value={localFormData.display_order || ""}
  onChange={(e) => {
    console.log("Display order changed to:", e.target.value);
    handleLocalInputChange("display_order", e.target.value);
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
  placeholder="0"
/>
      </div>

                  <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Section Title <span className="text-gray-400 text-xs">(Optional)</span>
  </label>
  <input
    type="text"
    value={localFormData.section_title || ""}
    onChange={(e) => handleLocalInputChange("section_title", e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
    placeholder="Enter section title..."
  />
</div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={localFormData.description}
                      onChange={(e) =>
                        handleLocalInputChange("description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Enter description..."
                    />
                  </div>

                  <div className="md:col-span-2">
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
                          onChange={handleLocalImageUpload}
                          className="hidden"
                        />
                      </label>
                      {localFormData.image_preview && (
                        <div className="relative">
                          <img
                            src={localFormData.image_preview}
                            alt="Preview"
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={handleLocalRemoveImage}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="border border-gray-500 px-4 py-2 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : isLocalAddingLevel ? (
              //  ADD LEVEL FORM WITH LOCAL STATE
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-4">
                  Add {addingLevelType === "second" ? "Second" : "Third"} Level
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={localFormData.entity_name}
                      onChange={(e) =>
                        handleLocalInputChange("entity_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter name..."
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Query ID
                    </label>
                    <input
                      type="text"
                      value={localFormData.query_id}
                      onChange={(e) =>
                        handleLocalInputChange("query_id", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter query ID..."
                    />
                  </div>

                  <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Order <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          value={localFormData.display_order || ""}
          onChange={(e) => handleLocalInputChange("display_order", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="0"
        />
      </div>

                  <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Section Title <span className="text-gray-400 text-xs">(Optional)</span>
  </label>
  <input
    type="text"
    value={localFormData.section_title || ""}
    onChange={(e) => handleLocalInputChange("section_title", e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
    placeholder="Enter section title..."
  />
</div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={localFormData.description}
                      onChange={(e) =>
                        handleLocalInputChange("description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Enter description..."
                    />
                  </div>

                  <div className="md:col-span-2">
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
                          onChange={handleLocalImageUpload}
                          className="hidden"
                        />
                      </label>
                      {localFormData.image_preview && (
                        <div className="relative">
                          <img
                            src={localFormData.image_preview}
                            alt="Preview"
                            className="w-32 h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={handleLocalRemoveImage}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelAddLevel}
                    className="border border-gray-500 px-4 py-2 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLevel}
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode - your existing display code stays the same
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {hasValidChildren && (
                    <button onClick={toggleExpansion} className="p-1">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <div>
                    <h3 className="font-medium">{data.name || "Unnamed"}</h3>
                    {level === "third" && (
                      <>
                        <p className="text-xs text-gray-500">
                          Query ID: {data.query_id || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {data.description || "No description"}
                        </p>
                      </>
                    )}
                    {level === "first" && data.second_levels?.length > 0 && (
                      <p className="text-xs text-blue-600">
                        {data.second_levels.length} second level item(s)
                      </p>
                    )}
                    {level === "second" &&
                      data.third_levels?.length > 0 &&
                      (() => {
                        const hasOnlyQueryIdItems = data.third_levels.every(
                          (item) =>
                            (!item.name ||
                              item.name === null ||
                              item.name.trim() === "") &&
                            item.query_id
                        );

                        if (
                          hasOnlyQueryIdItems &&
                          data.third_levels.length === 1
                        ) {
                          return (
                            <p className="text-xs text-green-600">
                              Query ID: {data.third_levels[0].query_id}
                            </p>
                          );
                        } else if (
                          hasOnlyQueryIdItems &&
                          data.third_levels.length > 1
                        ) {
                          return (
                            <p className="text-xs text-green-600">
                              Query IDs:{" "}
                              {data.third_levels
                                .map((item) => item.query_id)
                                .join(", ")}
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-xs text-green-600">
                              {data.third_levels.length} third level item(s)
                            </p>
                          );
                        }
                      })()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
  {data.image &&
    data.image !== null &&
    data.image.trim() !== "" &&
    !data.image.includes("null") && (
      <img
        src={data.image}
        alt="Facility"
        className="w-12 h-10 object-cover rounded"
      />
    )}

  {level !== "third" && (
    <button
      onClick={handleAddLevel}
      className="text-green-600 bg-green-50 hover:text-green-700 p-2 hover:bg-green-100 rounded"
      title={`Add ${level === "first" ? "Second" : "Third"} Level`}
    >
      <Plus className="w-4 h-4" />
    </button>
  )}

  <button
    onClick={handleEdit}
    className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded"
  >
    <Edit className="w-4 h-4" />
  </button>
  <button
    onClick={() => handleDelete(data, level)}
    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
  >
    <Trash2 className="w-4 h-4" />
  </button>
</div>
              </div>
            )}
          </div>

          {isExpanded &&
  !isLocalEditing &&
  !isLocalAddingLevel && (
    <div className="border-t px-4 pb-4 space-y-2">
      {/* Show loading spinner while fetching second level children */}
      {level === "first" && loadingChildren[data.id] && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Loading...</p>
        </div>
      )}

      {/* ADD THIS: Show loading spinner while fetching third level children */}
      {level === "second" && loadingThirdLevels[`${data.firstLevelDocId}-${data.id}`] && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <p className="ml-3 text-gray-600">Loading...</p>
        </div>
      )}

      {/* Show second level children once loaded */}
      {level === "first" && !loadingChildren[data.id] &&
        data.second_levels?.map((secondItem, index) => (
          <TreeCard
            key={`${currentPath}-second-${index}`}
            data={{
              ...secondItem,
              firstLevelDocId: data.id,
            }}
            level="second"
            parentPath={currentPath}
            fetchChildren={fetchChildren}
            loadedChildren={loadedChildren}
            loadingChildren={loadingChildren}
            fetchThirdLevels={fetchThirdLevels}          // ADD THIS
            loadedThirdLevels={loadedThirdLevels}        // ADD THIS
            loadingThirdLevels={loadingThirdLevels}      // ADD THIS
          />
        ))}
      
      {/* Show third level children once loaded */}
      {level === "second" && !loadingThirdLevels[`${data.firstLevelDocId}-${data.id}`] &&
        data.third_levels?.map((thirdItem, index) => (
          <TreeCard
            key={`${currentPath}-third-${index}`}
            data={{
              ...thirdItem,
              firstLevelDocId: data.firstLevelDocId,
              secondLevelId: data.id,
            }}
            level="third"
            parentPath={currentPath}
            fetchChildren={fetchChildren}
            loadedChildren={loadedChildren}
            loadingChildren={loadingChildren}
            fetchThirdLevels={fetchThirdLevels}          // ADD THIS
            loadedThirdLevels={loadedThirdLevels}        // ADD THIS
            loadingThirdLevels={loadingThirdLevels}      // ADD THIS
          />
        ))}
    </div>
  )}
        </div>
      );
    },
    (prevProps, nextProps) => {
      return (
        prevProps.data === nextProps.data &&
        prevProps.level === nextProps.level &&
        prevProps.parentPath === nextProps.parentPath &&
        prevProps.loadedChildren === nextProps.loadedChildren &&
        prevProps.loadingChildren === nextProps.loadingChildren &&
        prevProps.loadedThirdLevels === nextProps.loadedThirdLevels &&      // ADD THIS
        prevProps.loadingThirdLevels === nextProps.loadingThirdLevels       // ADD THIS
      );
    }
  );

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
        <div className="max-w-9xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
              Edit Facilities
            </h1>
            <div className="flex space-x-2">
              {/* <button
                  onClick={fetchFacilities}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md shadow-sm font-medium"
                >
                  Refresh
                </button> */}
              <button
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm font-medium"
              >
                Add Facility
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by Entity Name or Description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-white border border-[#E2E2E4] custom-shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Add New Facility
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Level Name - REQUIRED */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Level Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_level_name || ""}
                    onChange={(e) =>
                      handleInputChange("first_level_name", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      !(formData.first_level_name || "").trim()
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g., Collections"
                    required
                  />
                  {!(formData.first_level_name || "").trim() && (
                    <p className="text-red-500 text-xs mt-1">
                      This field is required
                    </p>
                  )}
                </div>

                {/* First Level Query ID - REQUIRED */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Level Query ID
                    {getLastFilledLevel() === "first" && (
                      <span className="text-red-500">*</span>
                    )}
                    {getLastFilledLevel() !== "first" && (
                      <span className="text-gray-400 text-xs">(Optional)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.first_level_query_id || ""}
                    onChange={(e) =>
                      handleInputChange("first_level_query_id", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      getLastFilledLevel() === "first" &&
                      !(formData.first_level_query_id || "").trim()
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g., Q123"
                  />
                  {getLastFilledLevel() === "first" &&
                    !(formData.first_level_query_id || "").trim() && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                </div>

                <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    First Level Display Order <span className="text-gray-400 text-xs">(Optional)</span>
  </label>
  <input
    type="number"
    value={formData.l1_order || ""}
    onChange={(e) => handleInputChange("l1_order", e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    placeholder="0"
  />
</div>

                {/* Second Level Name - OPTIONAL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Second Level Name{" "}
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.second_level_name || ""}
                    onChange={(e) =>
                      handleInputChange("second_level_name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Books A-Z"
                  />
                </div>

                {/* Second Level Query ID - CONDITIONAL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Second Level Query ID
                    {getLastFilledLevel() === "second" && (
                      <span className="text-red-500">*</span>
                    )}
                    {getLastFilledLevel() !== "second" && (
                      <span className="text-gray-400 text-xs">(Optional)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.second_level_query_id || ""}
                    onChange={(e) =>
                      handleInputChange("second_level_query_id", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      getLastFilledLevel() === "second" &&
                      !(formData.second_level_query_id || "").trim()
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g., Q99"
                  />
                  {getLastFilledLevel() === "second" &&
                    !(formData.second_level_query_id || "").trim() && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                </div>

                {(formData.second_level_name || "").trim() && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Second Level Display Order <span className="text-gray-400 text-xs">(Optional)</span>
    </label>
    <input
      type="number"
      value={formData.l2_order || ""}
      onChange={(e) => handleInputChange("l2_order", e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      placeholder="0"
    />
  </div>
)}

                {/* Third Level Name - OPTIONAL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Third Level Name{" "}
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.third_level_name || ""}
                    onChange={(e) =>
                      handleInputChange("third_level_name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Books A-DS776 (1/F Zone A)"
                  />
                </div>

                {/* Third Level Query ID - CONDITIONAL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Third Level Query ID
                    {getLastFilledLevel() === "third" && (
                      <span className="text-red-500">*</span>
                    )}
                    {getLastFilledLevel() !== "third" && (
                      <span className="text-gray-400 text-xs">(Optional)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.third_level_query_id || ""}
                    onChange={(e) =>
                      handleInputChange("third_level_query_id", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      getLastFilledLevel() === "third" &&
                      !(formData.third_level_query_id || "").trim()
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g., Q999"
                  />
                  {getLastFilledLevel() === "third" &&
                    !(formData.third_level_query_id || "").trim() && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                </div>

                {(formData.third_level_name || "").trim() && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Third Level Display Order <span className="text-gray-400 text-xs">(Optional)</span>
    </label>
    <input
      type="number"
      value={formData.l3_order || ""}
      onChange={(e) => handleInputChange("l3_order", e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      placeholder="0"
    />
  </div>
)}

                {/* Add after third_level_query_id field */}
{/* Section Title L2 - Show only if second level name is filled */}
{(formData.second_level_name || "").trim() && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Second Level Section Title <span className="text-gray-400 text-xs">(Optional)</span>
    </label>
    <input
      type="text"
      value={formData.section_title_l2 || ""}
      onChange={(e) => handleInputChange("section_title_l2", e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      placeholder="e.g., Section A"
    />
  </div>
)}

{/* Section Title L3 - Show only if third level name is filled */}
{(formData.third_level_name || "").trim() && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Third Level Section Title <span className="text-gray-400 text-xs">(Optional)</span>
    </label>
    <input
      type="text"
      value={formData.section_title_l3 || ""}
      onChange={(e) => handleInputChange("section_title_l3", e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      placeholder="e.g., Section 1"
    />
  </div>
)}

                {/* Description - OPTIONAL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description{" "}
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter facility description..."
                  />
                </div>

                {/* Image - OPTIONAL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image{" "}
                    <span className="text-gray-400 text-xs">(Optional)</span>
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
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.image_preview && (
                      <div className="relative">
                        <img
                          src={formData.image_preview}
                          alt="Preview"
                          className="w-32 h-20 object-cover rounded-lg"
                        />
                        <button
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Required fields notice */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Note:</span>You must provide a
                  Query ID for the last level you choose to fill in. For
                  example: if you fill up to third level, only third level Query
                  ID is required.
                </p>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancel}
                  className="border border-gray-500 bg-transparent hover:bg-gray-600 text-black hover:text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    loading ||
                    !(formData.first_level_name || "").trim() ||
                    (getLastFilledLevel() === "first" &&
                      !(formData.first_level_query_id || "").trim()) ||
                    (getLastFilledLevel() === "second" &&
                      !(formData.second_level_query_id || "").trim()) ||
                    (getLastFilledLevel() === "third" &&
                      !(formData.third_level_query_id || "").trim())
                  }
                  className={`px-4 py-2 rounded-md shadow-sm font-medium transition-colors ${
                    loading ||
                    !(formData.first_level_name || "").trim() ||
                    (getLastFilledLevel() === "first" &&
                      !(formData.first_level_query_id || "").trim()) ||
                    (getLastFilledLevel() === "second" &&
                      !(formData.second_level_query_id || "").trim()) ||
                    (getLastFilledLevel() === "third" &&
                      !(formData.third_level_query_id || "").trim())
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {loading ? "Saving..." : "Save Facility"}
                </button>
              </div>
            </div>
          )}

          {/* search results */}
          {!loading && (
            <div className="mb-4 text-sm text-gray-600">
              {searchTerm ? (
                <span>
                  Showing {filteredData.length} of {facilitiesData.length}{" "}
                  facilities
                  {searchTerm && (
                    <span className="ml-1">for "{searchTerm}"</span>
                  )}
                </span>
              ) : (
                <span></span>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && !showAddForm && !editingRow ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="ml-4 text-gray-600">Loading facilities...</p>
            </div>
          ) : (
            <div className="space-y-4">
            {filteredData.map((firstLevel) => (
              <TreeCard 
                key={firstLevel.id} 
                data={firstLevel} 
                level="first" 
                fetchChildren={fetchChildren}          
                loadedChildren={loadedChildren}        
                loadingChildren={loadingChildren}
                fetchThirdLevels={fetchThirdLevels}          // ADD THIS
                loadedThirdLevels={loadedThirdLevels}        // ADD THIS
                loadingThirdLevels={loadingThirdLevels}      // ADD THIS
              />
            ))}
          </div>
          )}
        </div>

        {/* Text Images Section */}

      </main>
    </div>
  );
};

export default EditFacilities;
