function details() {
  return {
    id: "Tdarr_Plugin_s120_fantom_qsv_hevc",
    Stage: "Pre-processing",
    Name: "WillFantom H265 QSV Configurable",
    Type: "Video",
    Description: `[Contains built-in filter] This plugin transcodes all videos not h265 encoded to h265 using Intel QuickSync Video. 
    All audio, metadata, subs and chapters are left untouched. This uses psy options that can result in a good image with a minimal file size. 
    Try on a single video to see if the image quality is up to any standards you set.`,
    Version: "0.10",
    Link: "https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/Community/Tdarr_Plugin_s120_fantom_qsv_hevc.js",
    Tags: "pre-processing,ffmpeg,h265,qsv",
    Inputs: [
      {
        name: "quality",
        tooltip: `\\nEnter a quality number:

        \\n Very High Quality: 1\\n
          > Uses a CRF of 19\\n
          
        \\n High Quality: 2\\n
          > Uses a CRF of 20\\n

        \\n Medium Quality: 3\\n
          > Uses a CRF of 21\\n

        \\n Other: N > 15:\\n
          > Give a custom CRF value (min 15 | max 25)\\n
        `
      },
      {
        name: "minimum_resolution",
        tooltip: `\\nOnly convert files above a given resolution\\n
          Values: 720p | 1080p | 4kuhd\\n
          Default: No Minimum
          \\nNote: Only 720p,1080p,4kuhd supported (all others will pass the resoluation gate)`
      },
      {
        name: "maximum_resolution",
        tooltip: `\\nOnly convert files below a given resolution\\n
          Values: 720p | 1080p | 4kuhd\\n
          Default: No Maximum
          \\nNote: Only 720p,1080p,4kuhd supported (all others will pass the resoluation gate)`
      },
    ],
  };
}

function plugin(file, librarySettings, inputs) {

  //
  var resArray = ["720p", "1080p", "4kuhd"];

  //Returning Object
  var response = {
    processFile: false,
    preset: "",
    container: ".mkv",
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: "",
  };

  //Input Encoding Viable (Video && not HEVC)
  if (file.fileMedium !== "video") {
    response.infoLog += "Error: Input file is not a video!\n";
    return response;
  }
  if (file.video_codec_name == "hevc") {
    response.infoLog += "Error: Input file is already HEVC (h.265)\n";
    return response;
  }

  //Deafult Configuration
  var crf = 20;
  var qcomp = 0.75;
  var minRes = 0;
  var maxRes = Infinity;

  //Verify Resolution
  if (inputs.minimum_resolution !== "") {
    if (resArray.indexOf(String(inputs.minimum_resolution).toLowerCase()) < 0) {
      response.infoLog += "Error: Minimum Resolution must be one of the described values (hd, fullhd, 4kud)\n";
      return response;
    }
    minRes = resStringValue(inputs.minimum_resolution.toLowerCase(), 0);
    response.infoLog += `Config: Minimum resolution set okay - ${minRes}\n`;
  }
  if (inputs.maximum_resolution !== "") {
    if (resArray.indexOf(String(inputs.maximum_resolution).toLowerCase()) < 0) {
      response.infoLog += "Error: Maximum Resolution must be one of the described values (hd, fullhd, 4kud)\n";
      return response;
    }
    maxRes = resStringValue(inputs.maximum_resolution.toLowerCase(), Infinity);
    response.infoLog += `Config: Maximum resolution set okay - ${maxRes}\n`;
  }
  if (maxRes < minRes) {
    response.infoLog += "Error: No space between max and min resolutions\nThis will catch no files!\n";
    return response;
  }
  var height = resStringValue(file.video_resolution.toLowerCase(), (file.ffProbeData.streams[0].height));
  if (height < minRes || height > maxRes) {
    response.infoLog += `Not Processing: Video resolution is out of bounds based on your configuration (${height})\n`;
    return response;
  }

  //Set Quality
  if (inputs.quality !== "") {
    if (!isInt(inputs.quality)) {
      response.infoLog += "Error: Given quality must be a number!\n";
      return response;
    }
    var qualityInt = parseInt(inputs.quality, 10)
    if (qualityInt >= 1 && qualityInt <= 3) {
      switch (qualityInt) {
        case 1:
          crf = 19;
          break;
        case 2:
          crf = 20;
          break;
        case 3:
          crf = 21;
          break;
      }
    } else if (qualityInt >= 15 && qualityInt <= 25) {
      crf = qualityInt;
    } else {
      response.infoLog += "Error: Given quality must be between 1-3 for set quality modes\n";
      return response;
    }
    response.infoLog += `Config: CRF set okay - ${crf}\n`;
  }

  //Fix QComp
  if (crf < 20) {
    qcomp = 0.8;
  }

  //Process
  response.processFile = true;
  response.preset = `-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi, -map_chapters 0 -map_metadata 0 -c:v hevc_vaapi -preset slower -x265-params crf=${String(crf)}:ctu=32:max-tu-size=16:qcomp=${String(qcomp)}:aq-mode=1:aq-strength=1.0:psy-rd=1.8:psy-rdoq=5.0:rdoq-level=1:deblock=-2:-2:qg-size=16:no-sao:me_range=44:no-rect:no-amp -c:a copy -c:s copy`;
  response.infoLog += `Config: crf=${String(crf)} qcomp=${String(qcomp)}\n`;
  return response;
}

function resStringValue(value, norm) {
  switch (value) {
    case "720p":
      return 720;
    case "1080p":
      return 1080;
    case "4kuhd":
      return 2160;
    default:
      return norm;
  }
}

function isInt(value) {
  // Stonks Overflown
  return !isNaN(value) &&
    parseInt(Number(value)) == value &&
    !isNaN(parseInt(value, 10));
}

module.exports.details = details;
module.exports.plugin = plugin;
