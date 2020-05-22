function generateWindow(divider) {
const getContainerData = document.querySelector('#container'),
setContainerData = document.getElementById('container').style,
getLowerCoverData = document.querySelector('#lower-cover'),
setLowerCoverData = document.getElementById('lower-cover').style,
getCoverData = document.querySelector('#cover'),
setCoverData = document.getElementById('cover').style;

bottom = (getContainerData.clientHeight - 10) / divider;

setLowerCoverData.bottom = `${bottom}px`;
setContainerData.width = `${getContainerData.clientWidth / divider}px`;
setContainerData.height = `${getContainerData.clientHeight / divider}px`;
setLowerCoverData.width = `${getLowerCoverData.clientWidth / divider}px`;
setLowerCoverData.height = `${getLowerCoverData.clientHeight / divider}px`;
setCoverData.width = `${getCoverData.clientWidth / divider}px`;
setCoverData.height = `${getCoverData.clientHeight / divider}px`;
}

