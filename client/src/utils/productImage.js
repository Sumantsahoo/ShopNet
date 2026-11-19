export const getProductImageUrl = (imageUrl, width = 600) => {
    if (typeof imageUrl !== 'string') return '';

    const cloudinaryUpload = imageUrl.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/i);
    if (!cloudinaryUpload) return imageUrl;

    const [, uploadPath, assetPath] = cloudinaryUpload;
    if (/^[a-z]_[^/]+(?:,[^/]+)*\//i.test(assetPath)) return imageUrl;

    return `${uploadPath}f_auto,q_auto,w_${width},c_limit/${assetPath}`;
};
