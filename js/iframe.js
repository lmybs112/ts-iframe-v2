var reset;
var Route = "";
var Brand = "";
var SpecifyTags = [];
var SpecifyKeywords = [];
var tags_chosen = {};
let startX, endX;
let current_route_path;
let current_Route;
let all_Route;
let isFirst = true;
let throttleTimer = null;
let formatTagGroupMap = {};
let isFetchCouponCalled = false;
let isForPreview = window.location.href
  .toLocaleLowerCase()
  .includes("myinffits");

let isForReferral = window.location.href
  .toLocaleLowerCase()
  .includes("referral");
let firstResult = {};

function throttle(fn, delay) {
  let isFirstCall = true; // 用來判斷是否是第一次調用
  return function (...args) {
    if (isFirstCall) {
      fn.apply(this, args); // 第一次調用立即執行
      isFirstCall = false;
      throttleTimer = setTimeout(() => {
        throttleTimer = null; // 清除計時器
      }, delay);
    } else if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        fn.apply(this, args);
        throttleTimer = null;
      }, delay);
    }
  };
}

$(document).ready(function () {
  // 動態添加 Google 字體連結
  var googleFontLink = document.createElement("link");
  googleFontLink.rel = "preconnect";
  googleFontLink.href = "https://fonts.googleapis.com";
  document.head.appendChild(googleFontLink);

  var googleFontLink2 = document.createElement("link");
  googleFontLink2.rel = "preconnect";
  googleFontLink2.href = "https://fonts.gstatic.com";
  googleFontLink2.crossorigin = "anonymous";
  document.head.appendChild(googleFontLink2);

  var googleFontLink3 = document.createElement("link");
  googleFontLink3.rel = "stylesheet";
  googleFontLink3.href =
    "https://fonts.googleapis.com/css2?family=Chocolate+Classical+Sans&family=Figtree:ital,wght@0,300..900;1,300..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap";
  document.head.appendChild(googleFontLink3);
  $("#intro-page").on("pointerdown", function (e) {
    if ($(e.target).closest(".intro-content").length) {
      return; // 如果點擊在 .intro-content 內，則不執行後續操作
    }
    const messageData = {
      type: "closeModal",
      value: true,
    };
    $(".icon-reminder").removeClass("open");
    $(".text-reminder").removeClass("visible");
    $(".icon-inffits").removeClass("open");
    $(".text-inffits").removeClass("visible");
    window.parent.postMessage(messageData, "*");
  });
  $(".intro-content").on("pointerdown", function (e) {
    $(".icon-reminder").removeClass("open");
    $(".text-reminder").removeClass("visible");
    $(".icon-inffits").removeClass("open");
    $(".text-inffits").removeClass("visible");
  });
});

let isFetching = false; // 新增標誌
const get_recom_res = () => {
  if (isFetching) return;
  isFetching = true;
  $("#loadingbar_recom").show();
  if (isForReferral) {
    const messageData = {
      type: "loadingBar",
      value: true,
    };
    window.parent.postMessage(messageData, "*");
  }

  const formatTags = Object.fromEntries(
    Object.entries(tags_chosen)
      .map(([key, value]) => [
        key,
        value.filter((item) => item.Name !== "example"), // 過濾掉 Name 為 "example" 的項目
      ])
      .filter(([_, value]) => value.length > 0) // 移除值為空陣列的鍵
  );
  let options = {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      Brand: Brand,
      Tags: tags_chosen,
      NUM: 12,
      SpecifyTags: SpecifyTags,
      SpecifyKeywords: SpecifyKeywords,
    }),
  };
  if (isForReferral) {
    const messageData = {
      type: "result_store",
      [`${Brand}_${current_route_path.Route}`]: tags_chosen,
    };
    window.parent.postMessage(messageData, "*");
    // console.error("messageData", messageData);
  }

  // console.warn("tags chosen:", tags_chosen);
  var INFS_ROUTE_ORDER = !isForPreview
    ? JSON.parse(localStorage.getItem(`INFS_ROUTE_ORDER_${Brand}`)) || []
    : [];
  INFS_ROUTE_ORDER.forEach((item, index) => {
    if (deepEqualWithoutKey(item, current_route_path, ["Record"])) {
      INFS_ROUTE_ORDER[index] = {
        ...item,
        Record: tags_chosen, // 修改 Record
      };
    }
  });
  var INFS_ROUTE_RES = !isForPreview
    ? JSON.parse(localStorage.getItem(`INFS_ROUTE_RES_${Brand}`)) || []
    : [];

  const matchIndex = INFS_ROUTE_ORDER.findIndex((item) =>
    deepEqualWithoutKey(item, current_route_path, ["Record"])
  );

  // 如果找到了，則將其移到 INFS_ROUTE_RES
  if ((matchIndex !== -1) & !isForPreview) {
    // console.error("matchIndex", matchIndex);
    // console.error("isForPreview", isForPreview);
    const matchedItem = INFS_ROUTE_ORDER.splice(matchIndex, 1)[0]; // 移除並取得物件
    INFS_ROUTE_RES.push(matchedItem); // 將物件推到 RES 陣列

    // 更新 localStorage
    if (!isForPreview) {
      localStorage.setItem(
        `INFS_ROUTE_ORDER_${Brand}`,
        JSON.stringify(INFS_ROUTE_ORDER)
      );
      localStorage.setItem(
        `INFS_ROUTE_RES_${Brand}`,
        JSON.stringify(INFS_ROUTE_RES)
      );
    }
  }
  // tags_chosen = {};

  fetch(
    "https://api.inffits.com/http_mkt_extensions_recom/recom_product",
    // "https://ldiusfc4ib.execute-api.ap-northeast-1.amazonaws.com/v0/extension/recom_product",
    options
  )
    .then((response) => response.json())
    .then(async (response) => {
      // setTimeout(() => {
      const messageData = {
        type: "result",
        value: true,
      };
      window.parent.postMessage(messageData, "*");
      // console.error("Message", response);
      firstResult = response;
      await show_results(response, true);
      // }, 1500);
    })
    .catch((err) => {
      console.error("err", err);
    })
    .finally(() => {
      if (isForReferral) {
        const messageData = {
          type: "loadingBar",
          value: false,
        };
        window.parent.postMessage(messageData, "*");
      }
      setTimeout(() => {
        // $("#loadingbar_recom").fadeOut(500);
        isFetching = false;
      }, 2200);
    });
};

const getEmbedded = async () => {
  const requestData = {
    Brand: Brand,
    LGVID: "SObQG1eZ0oxzKmpgT2dc",
    MRID: "",
    recom_num: "12",
    PID: "",
  };
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(requestData),
  };

  try {
    const response = await fetch(
      "https://api.inffits.com/HTTP_inf_bhv_cdp_product_recommendation/extension/recom_product",
      options
    );
    const data = await response.json();
    let jsonData = getRandomElements(data["bhv"], data["bhv"].length < 6 ? data["bhv"].length : 6).map((item) => {
      let newItem = Object.assign({}, item);
      newItem.sale_price = item.sale_price
        ? parseInt(item.sale_price.replace(/\D/g, "")).toLocaleString("en-US", {
            style: "currency",
            currency: "TWD",
            minimumFractionDigits: 0,
          })
        : "";
      newItem.price = parseInt(item.price.replace(/\D/g, "")).toLocaleString(
        "en-US",
        {
          style: "currency",
          currency: "TWD",
          minimumFractionDigits: 0,
        }
      );
      return newItem;
    });

    const formatItems = jsonData.map((jsonDataItem) => ({
      Imgsrc: jsonDataItem.image_link,
      Link: jsonDataItem.link,
      ItemName: jsonDataItem.title,
      sale_price:  jsonDataItem.sale_price,
      price: jsonDataItem.price,
      ...jsonDataItem,
    }));

    // console.error("jsonData", jsonData);
    // console.error("formatItems", formatItems);

    const formatData = {
      Item: formatItems,
    };

    $("#recommend-title").text("猜你可能喜歡");
    $("#recommend-desc").text("目前無符合結果，推薦熱門商品給你。");
    $("#recommend-btn").text("刷新推薦");
    show_results(formatData);
  } catch (err) {
    console.error(err);
    getEmbeddedForTest();
  }
};

function getRandomElements(arr, count) {
  const result = [];
  const usedIndexes = new Set();

  while (result.length < count) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    if (!usedIndexes.has(randomIndex)) {
      result.push(arr[randomIndex]);
      usedIndexes.add(randomIndex);
    }
  }

  return result;
}
const getEmbeddedForTest = () => {
  const requestData = {
    Brand: "JERSCY",
    LGVID: "SObQG1eZ0oxzKmpgT2dc",
    MRID: "",
    recom_num: "12",
    PID: "",
  };
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(requestData),
  };
  fetch(
    "https://api.inffits.com/HTTP_inf_bhv_cdp_product_recommendation/extension/recom_product",
    options
  )
    .then((response) => response.json())
    .then((response) => {
      let jsonData = getRandomElements(response["bhv"], response["bhv"].length < 6 ? response["bhv"].length : 6).map((item) => {
        let newItem = Object.assign({}, item);
        newItem.sale_price = item.sale_price
          ? parseInt(item.sale_price.replace(/\D/g, "")).toLocaleString(
              "en-US",
              {
                style: "currency",
                currency: "TWD",
                minimumFractionDigits: 0,
              }
            )
          : "";
        newItem.price = parseInt(item.price.replace(/\D/g, "")).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "TWD",
            minimumFractionDigits: 0,
          }
        );
        return newItem;
      });
      const formatItems = jsonData.map((jsonDataItem) => {
        return {
          Imgsrc: jsonDataItem.image_link,
          Link: jsonDataItem.link,
          ItemName: jsonDataItem.title,
          sale_price: jsonDataItem.sale_price,
          price: jsonDataItem.price,
          ...jsonDataItem,
        };
      });

      // console.error("jsonData", jsonData);
      // console.error("formatItems", formatItems);

      const formatData = {
        Item: formatItems,
      };
      $("#recommend-title").text("猜你可能喜歡");
      $("#recommend-desc").text("目前無符合結果，推薦熱門商品給你。");
      $("#recommend-btn").text("刷新推薦");
      show_results(formatData);
      $("#container-recom").show();
    })
    .catch((err) => {
      console.error(err);
    });
};

const show_results = (response, isFirst = false) => {
  //只出現其中三個}
  const itemCount = response?.Item?.length || 0;
  // 如果項目數量小於 3，只顯示所有可用的項目
  const displayCount = Math.min(itemCount, 3);

  function getTopCommonIndices() {
    // 取得排序後的索引值陣列
    const indices = firstResult.Item.map((item, index) => ({
      index,
      common: item.COMMON,
    }))
      .sort((a, b) => b.common - a.common)
      .map((obj) => obj.index);

    // 取前最多 3 筆
    return indices.slice(0, 3);
  }

  function getRandomNumbers(max, count) {
    let randomNumbers = [];
    while (randomNumbers.length < count) {
      let num = Math.floor(Math.random() * max);
      if (!randomNumbers.includes(num)) {
        randomNumbers.push(num);
      }
    }
    return randomNumbers;
  }

  if (itemCount === 0 || !response) {
    getEmbedded();
    return;
  } else {
    $("#container-recom").show();
  }
  // const finalitem = getRandomNumbers(itemCount - 1, 3);
  const finalitem = isFirst
    ? getTopCommonIndices()
    : getRandomNumbers(itemCount, displayCount);
  // console.error("finalitem", finalitem);
  const finalitemCount = 3;
  $(`#container-recom`).find(".axd_selections").html("");

  for (let ii in finalitem) {
    let i = finalitem[ii];
    var ItemName = response.Item[i].ItemName;
    if (ItemName.length >= 16) {
      ItemName = ItemName.substring(0, 15) + "...";
    }
    $(`#container-recom`).find(".axd_selections").append(`
      <div class="axd_selection cursor-pointer update_delete">
 <a href="${
   response.Item[i].Link
 }" target="_blank" class="update_delete" style="text-decoration: none;">
    <div style="overflow: hidden;">
         <img class="c-recom" id="container-recom-${i}" data-item="0"  src="./../../img/img-default-large.png" data-src=" ${
      response.Item[i].Imgsrc
    }" onerror="this.onerror=null;this.src='./../../img/img-default-large.png'"
         ></div>
         <div class="recom-info">
         <p class="recom-text item-title line-ellipsis-2" id="recom-${i}-text">${ItemName}</p>
           <div class="discount-content">
             <p class="item-price recom-price">${
               response.Item[i].sale_price || response.Item[i].price || "-"
             }</p>
             </div>
         </div>
 </a>
  </div>
 `);
    $(`#container-recom img.c-recom`).each(function () {
      var $img = $(this);

      // 設置圖片初始 opacity 為 0
      $img.css("opacity", 0);

      // 創建一個新的 Image 對象來監聽加載事件
      var realImg = new Image();
      realImg.src = $img.data("src");

      // 當圖片加載完成後，替換佔位符並做淡入效果
      $(realImg)
        .on("load", function () {
          $img.attr("src", $img.data("src")); // 將佔位符圖片替換為真實圖片
          $img.animate({ opacity: 1 }, 1500); // 在1500毫秒內淡入圖片
        })
        .on("error", function () {
          // 處理圖片加載錯誤的情況
          $img.attr("src", "./../../img/img-default-large.png"); // 顯示預設錯誤圖片
          $img.animate({ opacity: 1 }, 1500); // 錯誤圖片也淡入
        });
    });
  }

  const selectionContainer = document.querySelector(
    `#container-recom .selection`
  );

  if (finalitemCount === 2) {
    selectionContainer.classList.add("two-elements");
  } else if (finalitemCount === 3) {
    selectionContainer.classList.add("three-elements");

    if (selectionContainer) {
      const axdSelections =
        selectionContainer.querySelectorAll(".axd_selection");
      if (axdSelections.length > 2) {
        axdSelections[2].classList.add("overflow-opacity");
      }
    }

    document
      .querySelector(".three-elements .axd_selections")
      .addEventListener("scroll", function (e) {
        var container = e.target;
        var selections = container.querySelectorAll(".axd_selection");

        selections.forEach(function (selection, index) {
          if (isVisible(selection, container)) {
            selection.classList.remove("overflow-opacity");
          } else {
            selection.classList.add("overflow-opacity");
          }
        });
      });

    function isVisible(element, container) {
      var elementRect = element.getBoundingClientRect();
      var containerRect = container.getBoundingClientRect();

      return (
        elementRect.right < containerRect.right &&
        elementRect.left > containerRect.left
      );
    }
  } else if (finalitemCount >= 4) {
    selectionContainer.classList.add("four-elements");
  }
};

// 深度比較函數（排除指定屬性）
function deepEqualWithoutKey(obj1, obj2, ignoreKeys = []) {
  const filteredObj1 = Object.fromEntries(
    Object.entries(obj1).filter(([key]) => !ignoreKeys.includes(key))
  );
  const filteredObj2 = Object.fromEntries(
    Object.entries(obj2).filter(([key]) => !ignoreKeys.includes(key))
  );
  return deepEqual(filteredObj1, filteredObj2);
}

// 通用深度比較函數
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (
    typeof obj1 !== "object" ||
    typeof obj2 !== "object" ||
    obj1 === null ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => deepEqual(obj1[key], obj2[key]));
}

const fetchCoupon = async () => {
  if (isFetchCouponCalled) return;
  isFetchCouponCalled = true;
  const requestData = {
    Brand: Brand,
    Module: "Personalized_Landing_Widget",
  };

  const options = {
    method: "POST",
    headers: { accept: "application/json" },
    body: JSON.stringify(requestData),
  };
  const response = await fetch(
    "https://api.inffits.com/mkt_discount_info_derive/GetItems",
    options
  );
  const data = await response.json();
  if (data && data.length > 0) {
    $("#intro-coupon-modal__content-coupons").html(
      data
        .map((item) => {
          // 首先檢查 status
          if (item.status === false) {
            // 如果 status 為 false，顯示帶蒙層的優惠券
            return `
            <div class="intro-coupon-modal__content-container-content" style="position: relative;">
                <div class="intro-coupon-modal__content-container-content-icon">
                  <img src="img/coupon-vant.png" alt="coupon icon" width="25" height="25" />
                </div>
                <div class="intro-coupon-modal__content-container-content-line">
                  <svg xmlns="http://www.w3.org/2000/svg" width="2" height="44" viewBox="0 0 2 44" fill="none">
                    <path d="M1 1V43" stroke="#E0E0DF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 8"/>
                  </svg>
                </div>
                <div class="intro-coupon-modal__content-container-content-text">
                  <p>${item.Title}</p>
                  <div class="intro-coupon-modal__content-container-content-footer">
                    <p>${item.Description}</p>
                    <button class="intro-coupon-modal__btn--coupon intro-coupon-modal__btn--coupon--disabled">領取</button>
                  </div>
                </div>
                <!-- 蒙層 -->
                <div style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(255, 255, 255, 0.75);
                  backdrop-filter: blur(3px);
                  -webkit-backdrop-filter: blur(3px);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  font-weight: bold;
                  color: #666;
                  border-radius: 8px;
                ">
                  敬請期待
                </div>
              </div>
        `;
          }
          
          // 如果 status 為 true，執行原本的日期判斷邏輯
          // 解析 TimeValid 日期範圍
          const timeValidParts = item.TimeValid ? item.TimeValid.split('~') : [];
          const startDate = timeValidParts[0] ? new Date(timeValidParts[0]) : null;
          const endDate = timeValidParts[1] ? new Date(timeValidParts[1]) : null;
          const currentDate = new Date();
          
          // 判斷按鈕狀態
          let buttonHtml = '';
          if (startDate && currentDate < startDate) {
            // 尚未開始
            buttonHtml = '<button class="intro-coupon-modal__btn--coupon intro-coupon-modal__btn--coupon--disabled">尚未開始</button>';
          } else if (endDate && currentDate > endDate) {
            // 已結束
            buttonHtml = '<button class="intro-coupon-modal__btn--coupon intro-coupon-modal__btn--coupon--disabled">已結束</button>';
          } else {
            // 可以領取
            buttonHtml = `
              <button class="intro-coupon-modal__btn--coupon intro-coupon-modal__btn--coupon--copy" onclick="copyCoupon('${item.Code}', this)">領取</button>
              <button class="intro-coupon-modal__btn--coupon intro-coupon-modal__btn--coupon--copied">已領取</button>
            `;
          }
          
          return `
          <div class="intro-coupon-modal__content-container-content">
              <div class="intro-coupon-modal__content-container-content-icon">
                <img src="img/coupon-vant.png" alt="coupon icon" width="25" height="25" />
              </div>
              <div class="intro-coupon-modal__content-container-content-line">
                <svg xmlns="http://www.w3.org/2000/svg" width="2" height="44" viewBox="0 0 2 44" fill="none">
                  <path d="M1 1V43" stroke="#E0E0DF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 8"/>
                </svg>
              </div>
                 <div class="intro-coupon-modal__content-container-content-text">
                <p>${item.Title}</p>
                <div class="intro-coupon-modal__content-container-content-footer">
                  <p>${item.Description}</p>
                  ${buttonHtml}
                </div>
              </div>
            </div>
      `;
        })
        .join("")
    );

    Product_Recommendation({
      brand: Brand,
      containerId: "hot-sale",
      customEdm: [],
      customPadding: "0px",
      backgroundColor: "#fff",
      title: "",
      arrowPosition: "none", // none, center, top (default: center)
      autoplay: false,
      hide_discount: true, // 隱藏折扣
      hide_size: true, // 隱藏尺寸
      bid: {
        HV: "165",
        WV: "45",
        CC: "97.5_97.5",
        DataItem: "0100",
        Shoulder: "",
        UpChest: "",
        DnChest: "",
        Waist: "",
        Hip: "",
        Brand: Brand,
        ClothID: "",
        Sizes: "",
        FitP: "0,0,0,0",
        Gender: "M",
        FMLpath: "FMLSep",
        BUS: "0",
        GVID: "",
        LGVID: "",
        MRID: "INF",
        ga_id: "x",
        Pattern_Prefer: "1",
      },
      breakpoints: {
        480: {
          slidesPerView: 3.5,
          slidesPerGroup: 1,
          spaceBetween: 8,
          speed: 750,
          resistanceRatio: 0,
          grid: {
            rows: 1,
            fill: "row",
          },
        },
        0: {
          slidesPerView: 3.5,
          slidesPerGroup: 1,
          spaceBetween: 8,
          speed: 750,
          resistanceRatio: 0,
          grid: {
            rows: 1,
            fill: "row",
          },
        },
      },
    });
    // 响应父页面的高度请求
    window.addEventListener(
      "message",
      function (event) {
        if (event.data && event.data.type === "requestHeight") {
          // 获取当前文档高度
          const height =
            document.documentElement.offsetHeight || document.body.offsetHeight;
          // 发送高度信息给父页面
          window.parent.postMessage(
            {
              type: "setHeight",
              height: height,
            },
            "*"
          );
        }
      },
      false
    );

    // 页面加载和内容变化时也发送高度
    function sendHeight() {
      const height =
        document.documentElement.offsetHeight || document.body.offsetHeight;
      window.parent.postMessage(
        {
          type: "setHeight",
          height: height,
        },
        "*"
      );
    }

    // 页面加载完成后发送高度
    window.addEventListener("load", sendHeight);
    // 当窗口大小改变时发送高度
    window.addEventListener("resize", sendHeight);
    // 定期检查高度变化
    setInterval(sendHeight, 500);

    $(".intro-content.intro-coupon-modal__content").show();
    $(".intro-content.intro-modal__content").hide();
  } else {
    $(".intro-content.intro-coupon-modal__content").hide();
    $(".intro-content.intro-modal__content").show();
  }
};

const fetchData = async () => {
  const options = { method: "GET", headers: { accept: "application/json" } };
  try {
    var obj;
    // 塞空值
    const response = await fetch(
      "https://xjsoc4o2ci.execute-api.ap-northeast-1.amazonaws.com/v0/extension/run_routeproduct?Brand=" +
        Brand +
        "&Route=" +
        Route,
      options
    );
    const data = await response.json();
    $("#loadingbar").hide();
    $("#pback").show();
    $("#containerback").show();
    $("#intro_page").show();
    obj = data;
    if (!obj.Product) return;
    current_Route = obj.Product["Route"] || "";
    all_Route = obj.Product["TagGroups_order"] || [];
    SpecifyTags = obj.Product["SpecifyTags"] || [];
    SpecifyKeywords = obj.Product["SpecifyKeywords"] || [];
    const formatTagGroupMap = (() => {
      const product = obj?.Product;
      const order = Array.isArray(product?.TagGroups_order)
        ? product.TagGroups_order
        : [];
      const descriptions = Array.isArray(product?.TagGroups_Description)
        ? product.TagGroups_Description
        : [];
      return order.reduce((map, key, index) => {
        if (descriptions[index] != null) {
          // 排除 undefined 或 null
          map[key] = descriptions[index];
        }
        return map;
      }, {});
    })();
    // 比較當前路線是否已存在
    var INFS_ROUTE_ORDER = !isForPreview
      ? JSON.parse(localStorage.getItem(`INFS_ROUTE_ORDER_${Brand}`)) || []
      : [];
    var INFS_ROUTE_RES = !isForPreview
      ? JSON.parse(localStorage.getItem(`INFS_ROUTE_RES_${Brand}`)) || []
      : [];
    // 當前路線
    current_route_path = {
      Route: current_Route,
      TagGroups_order: all_Route,
      Record: {},
    };
    // 過濾相符的物件
    let match;
    if (isFirst && !isForPreview) {
      isFirst = false;
      match = INFS_ROUTE_RES.find((item) =>
        deepEqualWithoutKey(item, current_route_path, ["Record"])
      );
      if (!match) {
        match = INFS_ROUTE_ORDER.find((item) =>
          deepEqualWithoutKey(item, current_route_path, ["Record"])
        );
      }

      if (match) {
        tags_chosen = match.Record;
      } else {
        INFS_ROUTE_ORDER.push(current_route_path);
        if (!isForPreview) {
          localStorage.setItem(
            `INFS_ROUTE_ORDER_${Brand}`,
            JSON.stringify(INFS_ROUTE_ORDER)
          );
        }
      }
    }

    let Route_in_frame = {};
    for (var n = 0; n < all_Route.length; n++) {
      Route_in_frame[all_Route[n]] = [];
    }
    for (var j = 0; j < obj.RouteConfig.length; j++) {
      let item = obj.RouteConfig[j];
      // let idx = all_Route.indexOf(item.TagGroup.S)
      Route_in_frame[item.TagGroup.S].push(item);
    }
    // console.error(Route_in_frame, "dog");
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipod|phone/.test(userAgent);

    const iconNext = isMobile
      ? "./../img/icon-next.svg"
      : "./../img/icon-next-large.svg";

    for (var r in Route_in_frame) {
      // console.log("TagGroup : " + r);
      document.getElementById("pback").insertAdjacentHTML(
        "beforebegin",
        `<div class='container mbinfo animX update_delete' id="container-${r.replaceAll(
          " ",
          ""
        )}">
                    <div class="c_header" id="container-x-header" style="border-bottom: 4px solid #F5F5F4">
                        
                        <img class="type_backarrow" id="container-${r.replaceAll(
                          " ",
                          ""
                        )}-backarrow" src="${iconNext}" width="100%"
                        height="100%" >
                        <div class="header-text">
                            <span style="margin-bottom: 0.3em">${r}</span>
                            <p class="desc-container">${
                              formatTagGroupMap?.[r] ??
                              (Array.isArray(Route_in_frame?.[r]) &&
                              Route_in_frame[r].length > 0
                                ? Route_in_frame[r][0]?.Description?.S ?? ""
                                : "")
                            }</p>
                        </div>
                        <img class='c-${r.replaceAll(
                          " ",
                          ""
                        )} skip icon-next type_backarrow flipped-image' src="${iconNext}" width="100%"
                        height="100%" >
                    </div>

                        <div class="selection_scroll slide swiper-container-${r.replaceAll(
                          " ",
                          ""
                        )}">
                            <div class="swiper-wrapper" >
                            </div>         
                        </div>
                    
                         <div class="pagination-${r.replaceAll(
                           " ",
                           ""
                         )} pag-margin dot-btns" style="text-align: center; ">
                        </div>
                     <div class="con-footer">
                        <a class='c-${r.replaceAll(" ", "")} skip'>略過</a>
                     </div>
                       
                    </div>`
      );

      //first route hide type_backarrow
      if (r === all_Route[0]) {
        // document.getElementById(
        //   `container-${r.replaceAll(" ", "")}-backarrow`
        // ).style.visibility = "hidden";

       const backarrow = document.getElementById(
          `container-${r.replaceAll(" ", "")}-backarrow`
        )
        $(backarrow).on(tap, function () {
          $("#intro-page").show();
          $("#container-" + all_Route[0]).hide();
          tags_chosen = {};
        });
      }

      var numPerPage = 6;
      const mediaQuery = window.matchMedia("(max-width: 400px)");
      function handleMediaQueryChange(mediaQuery, tar) {
        // console.log(tar);
        if (mediaQuery.matches) {
          // 如果屏幕寬度小於或等於 400px
          numPerPage = 4;

          init(tar);
        } else if (!mediaQuery.matches) {
          // 如果屏幕寬度大於 400px
          numPerPage = 6;
          init(tar);
        }
      }

      // 初始檢查

      if (mediaQuery.matches && numPerPage !== 4) {
        // 如果屏幕寬度小於或等於 400px
        numPerPage = 4;
      } else if (!mediaQuery.matches && numPerPage !== 6) {
        // 如果屏幕寬度大於 400px
        numPerPage = 6;
      }

      function init(tar) {
        let currentPage = 1;
        var target = tar.replaceAll(" ", "");

        // console.log(numPerPage, "numPerPage");

        $(`#container-${target}`).find(".selection").remove();
        $(`#container-${target}`).find(".remove-button").remove();

        $(`#container-${target}`).find(`.pagination-${target}`).empty();

        const itemCount = Route_in_frame[tar].length;
        const totalPages = Math.ceil(itemCount / numPerPage);

        const render_num = itemCount > numPerPage ? numPerPage : itemCount;

        // console.log(
        //   render_num,
        //   "render num",
        //   itemCount,
        //   numPerPage,
        //   `#container-${target}`
        // );

        $(`#container-${target}`)
          .find(".swiper-wrapper")
          .append(
            '<div class="selection swiper-slide"><div class="axd_selections selection"></div></div>'
          );

        for (let rr = 0; rr < render_num; rr++) {
          // console.log(Route_in_frame[target][rr], "dog");
          $(`#container-${target}`).find(".axd_selections").append(`
                            <div class="axd_selection ">
                                <div class="image-container c-${target} tagId-${Route_in_frame[target][rr].Tag.S}">
                                <div>
                                    <img class="axd_img" src="${Route_in_frame[target][rr].Imgsrc.S}" onerror="this.style.opacity='0'; this.parentNode.style.backgroundImage='url(./../img/img-default-large.png)';"  id="container-x-0" data-item="0">
                                </div>
                                
                                    <p>${Route_in_frame[target][rr].Name.S}</p>
                                    
                                </div>
                                
                            </div>
                        
                        `);
        }
        const selectionContainer = document.querySelector(
          `#container-${target} .selection`
        );

        if (itemCount === 2) {
          selectionContainer.classList.add("two-elements");
        } else if (itemCount === 3) {
          selectionContainer.classList.add("three-elements");

          selectionContainer
            .querySelectorAll(".axd_selection")[2]
            .classList.add("overflow-opacity");

          document
            .querySelector(".three-elements .axd_selections")
            .addEventListener("scroll", function (e) {
              var container = e.target;
              var selections = container.querySelectorAll(".axd_selection");

              selections.forEach(function (selection, index) {
                if (isVisible(selection, container)) {
                  selection.classList.remove("overflow-opacity");
                } else {
                  selection.classList.add("overflow-opacity");
                }
              });
            });

          function isVisible(element, container) {
            var elementRect = element.getBoundingClientRect();
            var containerRect = container.getBoundingClientRect();

            return (
              elementRect.right < containerRect.right &&
              elementRect.left > containerRect.left
            );
          }
        } else if (itemCount >= 4) {
          selectionContainer.classList.add("four-elements");
        }

        if (itemCount > numPerPage) {
          createPagination(r);
          $(`.pagination-${target} .dot[data-page="${1}"]`).addClass("active");
          var start = numPerPage;
          for (let i = 2; i <= totalPages; i++) {
            $(`#container-${target}`).find(".swiper-wrapper").append(`
                            <div class="selection swiper-slide four-elements" >
                            <div class="axd_selections selection selection-${i}"></div>
                             </div>
                            `);

            for (let rr = 0; rr < render_num && start < itemCount; rr++) {
              $(`#container-${target}`).find(`.selection-${i}`).append(`
                                <div class="axd_selection ">
                                    <div class="image-container c-${target} tagId-${Route_in_frame[target][start].Tag.S}">
                                         <div>
                                             <img class="axd_img" src="${Route_in_frame[target][start].Imgsrc.S}" onerror="this.style.opacity='0'; this.parentNode.style.backgroundImage='url(./../img/img-default-large.png)';" id="container-x-0" data-item="0">
                                        </div>
                                        <p>${Route_in_frame[target][start].Name.S}</p>
                                    </div>
                                </div>
                            `);
              start++;
            }
          }
        }

        if (itemCount >= 5) {
          // 監聽媒體查詢事件
          mediaQuery.addEventListener("change", (event) => {
            handleMediaQueryChange(mediaQuery, target);
          });
        }
        function createPagination(r) {
          for (let i = 1; i <= totalPages; i++) {
            $(`.pagination-${target}`).append(
              `<span class="dot" data-page="${i}"></span>`
            );
          }

          document
            .querySelectorAll(`.pagination-${target} .dot`)
            .forEach((dot) => {
              dot.addEventListener("click", function () {
                const pageIndex =
                  parseInt(this.getAttribute("data-page"), 10) - 1; // 將 data-page 轉為索引
                swiper.slideTo(pageIndex); // 指示 Swiper 切換到該幻燈片
              });
            });

          $(`.pagination-${target} .dot`).click(function () {
            currentPage = $(this).data("page");
            // renderPage(currentPage);
          });

          const swiper = new Swiper(`.swiper-container-${target}`, {
            direction: "horizontal",
            loop: false,
            threshold: 10,
            resistanceRatio: 0,
            speed: 300,
            on: {
              slideNextTransitionStart: function () {
                var activePageIndex = $(
                  `.pagination-${target} .dot.active`
                ).data("page");

                $(
                  `.pagination-${target} .dot[data-page="${activePageIndex}"]`
                ).removeClass("active");

                if (activePageIndex < totalPages)
                  activePageIndex = activePageIndex + 1;
                else activePageIndex = 1;
                $(
                  `.pagination-${target} .dot[data-page="${activePageIndex}"]`
                ).addClass("active");
              },
              slidePrevTransitionStart: function () {
                var activePageIndex = $(
                  `.pagination-${target} .dot.active`
                ).data("page");
                $(
                  `.pagination-${target} .dot[data-page="${activePageIndex}"]`
                ).removeClass("active");

                if (activePageIndex > 1) activePageIndex = activePageIndex - 1;
                else activePageIndex = totalPages;
                $(
                  `.pagination-${target} .dot[data-page="${activePageIndex}"]`
                ).addClass("active");
              },
            },
          });

          if (!mediaQuery.matches) {
            $(`#container-${target}`).append(
              `
                                <button class="nav-button remove-button left-button">
                                <div></div></button>
                                <button class="nav-button remove-button right-button"><div></div></button>

                            `
            );

            $(`#container-${target} .left-button`).click(function () {
              swiper.slidePrev();
              // console.log("left");
            });

            $(`#container-${target} .right-button`).click(function () {
              swiper.slideNext();
              // console.log("right");
            });
          }
        }

        bind();
      }
      init(r);
    }

    var mytap = window.ontouchstart === null ? "touchend" : "click";

    function bind() {
      for (var fs = 0; fs < all_Route.length; fs++) {
        (function (fs) {
          const currentRoute = all_Route[fs].replaceAll(" ", "");
          // 檢查並設定預設值
          var INFS_ROUTE_ORDER = !isForPreview
            ? JSON.parse(localStorage.getItem(`INFS_ROUTE_ORDER_${Brand}`)) ||
              []
            : [];
          const match = INFS_ROUTE_ORDER.find((item) =>
            deepEqualWithoutKey(item, current_route_path, ["Record"])
          );
          const skipShowResult = isForPreview || isForReferral;
          if (match && !skipShowResult) {
            tags_chosen = match.Record;
          }
          if (skipShowResult) {
            tags_chosen = {};
          }
          if (
            (Object.keys(tags_chosen).length > 0 && !isForPreview) ||
            (Object.keys(tags_chosen).length > 0 && !isForReferral)
          ) {
            if (
              tags_chosen[currentRoute] &&
              tags_chosen[currentRoute].length > 0
            ) {
              $("#intro-page").hide();
              const preset = tags_chosen[currentRoute][0];
              const tagIdClass = `tagId-${preset.Tag}`;
              const container = $(`#container-${currentRoute}`);
              // 找到對應的元素並標記為選中
              const presetElement = container.find(
                `.c-${currentRoute}.${tagIdClass}`
              );
              if (presetElement.length > 0) {
                presetElement.addClass("tag-selected"); // 標記選中
                // 模擬點擊以觸發點擊事件
                $("#container-" + currentRoute).hide();
                presetElement.trigger("click"); // 自動觸發click事件
                // console.error(`已自動選中並點擊: ${preset.Name}`);
              } else {
                // console.error(`skip ${currentRoute}`);
                $(".c-" + currentRoute + ".skip").click();
                // $("#container-" + currentRoute).hide();
              }
            }
          }

          $(".c-" + currentRoute + ".skip")
            .off(mytap)
            .on(mytap, function (e) {
              // console.error("$(this) SKIP", $(this));
              // if ($(this).text() == "略過") {
              var tag = `c-${all_Route[fs]}`;
              $(`.${tag}.tag-selected`).removeClass("tag-selected");
              $(".tag-selected").removeClass("tag-selected");
              tags_chosen[all_Route[fs].replaceAll(" ", "")] = [
                {
                  Description: "example",
                  Imgsrc: "https://example.com/imageB1.png",
                  Name: "example",
                  Tag: tag,
                  TagGroup: all_Route[fs],
                },
              ];
              // 修改符合條件的物件後更新 INFS_ROUTE_ORDER
              var INFS_ROUTE_ORDER = !isForPreview
                ? JSON.parse(
                    localStorage.getItem(`INFS_ROUTE_ORDER_${Brand}`)
                  ) || []
                : [];
              INFS_ROUTE_ORDER.forEach((item, index) => {
                if (deepEqualWithoutKey(item, current_route_path, ["Record"])) {
                  INFS_ROUTE_ORDER[index] = {
                    ...item,
                    Record: tags_chosen, // 修改 Record
                  };
                }
              });
              if (!isForPreview) {
                localStorage.setItem(
                  `INFS_ROUTE_ORDER_${Brand}`,
                  JSON.stringify(INFS_ROUTE_ORDER)
                );
              }
              // console.error("error skip add", tags_chosen);
              // }
              // console.log("skip", all_Route[fs]);
              if (fs == all_Route.length - 1) {
                $("#container-" + currentRoute).hide();
                if ($.isEmptyObject(tags_chosen)) {
                  var firstEl = $("#container-" + all_Route[fs])
                    .find(".image-container")
                    .first();
                  var tagid = firstEl.attr("class").match(/tagId-(\d+)/)[1];
                  // console.warn("tagid", tagid);
                  tags_chosen[all_Route[fs].replaceAll(" ", "")] = [
                    {
                      Description: "example",
                      Imgsrc: "https://example.com/imageB1.png",
                      Name: "example",
                      Tag: tagid,
                      TagGroup: all_Route[fs],
                    },
                  ];
                }
                get_recom_res();
              } else {
                // console.log(".c-" + all_Route[fs + 1].replaceAll(" ", ""));
                $("#container-" + currentRoute).hide();
                $("#container-" + all_Route[fs + 1].replaceAll(" ", "")).show();
              }
            });

          $(".c-" + currentRoute + ":not(.skip)")
            .off("click")
            .on("click", function (e) {
              var tagid = $(this)
                .attr("class")
                .match(/tagId-(\d+)/)[1];

              var tag = `c-${all_Route[fs]}`;
              $(`.${tag}.tag-selected`).removeClass("tag-selected");
              $(this).addClass("tag-selected");
              if (fs == all_Route.length - 1) {
                $("#container-" + currentRoute).hide();

                tags_chosen[all_Route[fs].replaceAll(" ", "")] = [
                  {
                    Description: $(
                      `#container-${all_Route[fs]} .desc-container`
                    )
                      .first()
                      .text(),
                    Imgsrc: $(this).find("img").attr("src"),
                    Name: $(this).find("p").text(),
                    Tag: tagid,
                    TagGroup: all_Route[fs],
                  },
                ];
                const hasRes =
                  document.querySelector("#container-recom .update_delete") !==
                  null;
                const get_recom_res_throttled = throttle(get_recom_res, 3000);

                if (!hasRes) {
                  get_recom_res_throttled();
                }
              } else {
                $("#container-" + currentRoute).hide();
                $("#container-" + all_Route[fs + 1].replaceAll(" ", "")).show();
                tags_chosen[all_Route[fs].replaceAll(" ", "")] = [
                  {
                    Description: $(
                      `#container-${all_Route[fs]} .desc-container`
                    )
                      .first()
                      .text(),
                    Imgsrc: $(this).find("img").attr("src"),
                    Name: $(this).find("p").text(),
                    Tag: tagid,
                    TagGroup: all_Route[fs],
                  },
                ];
              }
              // 修改符合條件的物件後更新 INFS_ROUTE_ORDER
              var INFS_ROUTE_ORDER =
                JSON.parse(localStorage.getItem(`INFS_ROUTE_ORDER_${Brand}`)) ||
                [];
              INFS_ROUTE_ORDER.forEach((item, index) => {
                if (deepEqualWithoutKey(item, current_route_path, ["Record"])) {
                  INFS_ROUTE_ORDER[index] = {
                    ...item,
                    Record: tags_chosen, // 修改 Record
                  };
                }
              });
              if (!isForPreview) {
                localStorage.setItem(
                  `INFS_ROUTE_ORDER_${Brand}`,
                  JSON.stringify(INFS_ROUTE_ORDER)
                );
              }
            });
          $(`#container-${all_Route[fs].replaceAll(" ", "")}-backarrow`).on(
            mytap,
            function (e) {
              if (fs != 0) {
                $("#container-" + currentRoute).hide();
                $("#container-" + all_Route[fs - 1].replaceAll(" ", "")).show();
              }
            }
          );

          if (fs == 0) {
            reset = async function () {
              const message = {
                header: "from_preview",
                id: Route,
                brand: Brand,
              };

              // 發送消息到接收窗口
              window.dispatchEvent(
                new MessageEvent("message", { data: message })
              );
              const messageData = {
                type: "result",
                value: false,
              };
              window.parent.postMessage(messageData, "*");
              tags_chosen = {};
            };
          }
        })(fs);
      }
    }
    bind();

    var pass_data = {
      MsgHeader: "fetchDone",
    };
    window.parent.postMessage(pass_data, "*");
  } catch (error) {
    console.error("Fetch error:", error);
  }
};
var tap = window.ontouchstart === null ? "touchend" : "click";

$(".icon-inffits").on(tap, function () {
  $(".icon-inffits").toggleClass("open");
  $(".text-inffits").toggleClass("visible");
  $(".icon-reminder").removeClass("open");
  $(".text-reminder").removeClass("visible");
});
$(".icon-reminder").on(tap, function () {
  $(".icon-reminder").toggleClass("open");
  $(".text-reminder").toggleClass("visible");
  $(".icon-inffits").removeClass("open");
  $(".text-inffits").removeClass("visible");
});

function copyCoupon(couponCode, btn) {
  navigator.clipboard
    .writeText(couponCode)
    .then(() => {
      console.log("已複製優惠碼：", couponCode);
      const $btn = $(btn);
      const $parent = $btn.closest(
        ".intro-coupon-modal__content-container-content-footer"
      );
      const $copiedBtn = $parent.find(
        ".intro-coupon-modal__btn--coupon--copied"
      );

      // 切換按鈕顯示
      $btn.hide();
      $copiedBtn.show();

      setTimeout(() => {
        $btn.show();
        $copiedBtn.hide();
      }, 3000);
    })
    .catch((err) => {
      console.error("複製失敗：", err);
      alert("無法複製優惠碼，請手動複製。");
    });
}

$("#start-button").on(tap, function () {
  $("#recommend-title").text("專屬商品推薦");
  $("#recommend-desc").text("根據您的偏好，精選以下單品。"); // 使用淡入動畫
  $("#recommend-btn").text("刷新推薦");
  // 隱藏介紹頁面，顯示第一個推薦內容頁面
  $("#intro-page").hide();
  $("#container-" + all_Route[0]).show();
});

$("#recommend-btn").on(tap, async function () {
  $("#loadingbar_recom").hide();

  const $loadingOverlay = $('<div id="loading-overlay"></div>')
    .css({
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background:
        "rgba(255, 255, 255, 0.9) url('./../img/recom-loading-desktop.gif') no-repeat center center / contain",
      zIndex: 9999,
    })
    .appendTo("#container-recom");

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipod|phone/.test(userAgent);
  const backgroundImage = isMobile
    ? "./../img/recom-loading-mobile.gif" // 手機版背景
    : "./../img/recom-loading-desktop.gif"; // 桌面版背景
  $("#loading-overlay").css(
    "background",
    `rgba(255, 255, 255, 0.9) url('${backgroundImage}') no-repeat center center / contain`
  );

  const messageData = {
    type: "result",
    value: true,
  };
  window.parent.postMessage(messageData, "*");
  if (firstResult.Item?.length <= 3) {
    await getEmbedded().finally(() => {
      setTimeout(() => {
        $loadingOverlay.fadeOut(300, function () {
          $(this).remove();
        });
      }, 1000);
    });
  } else {
    show_results(firstResult);
    $("#recommend-title").text("精選推薦商品");
    $("#recommend-desc").text("更多您可能喜愛的商品");

    setTimeout(() => {
      $loadingOverlay.fadeOut(300, function () {
        $(this).remove();
      });
    }, 1000);
  }
});

$("#startover").on(tap, function () {
  $("#loadingbar_recom").hide();
  Initial();
  reset();
});

const Initial = () => {
  $(".update_delete").remove();
  $("#container-recom").hide();

  tags_chosen = {};
};

window.addEventListener("message", async (event) => {
  // console.warn("message", event);
  if (event.data.header == "from_preview") {
    await Initial();

    Route = event.data.id;
    Brand = event.data.brand;

    fetchData();
    fetchCoupon();

    $("#intro-page").fadeIn(800);
  }
});
