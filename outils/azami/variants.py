import re, subprocess
base = open('/home/claude/maison/azami/v44/statiques/azami_v44_repos_statique.svg').read()
MASK = '<path d="M107 220 Q110 184 147 181 Q166 179 174 182 Q194 175 213 183 Q245 190 244 226 Q241 276 179 280 Q114 280 107 237 Q106 229 107 220Z" fill="#39201E"/>'
assert MASK in base
RIM = '<ellipse rx="23" ry="26" fill="#FFF2D9"/>'
GRAD = '''<defs><radialGradient id="mask" cx="177" cy="248" r="92" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#5E3A31"/><stop offset=".5" stop-color="#6B4538"/><stop offset=".78" stop-color="#8A5E4C" stop-opacity=".75"/><stop offset="1" stop-color="#C79C7E" stop-opacity="0"/></radialGradient></defs>'''
def variant(name, s):
    open(f'var_{name}.svg', 'w').write(s)
# A : actuel
variant('A', base)
# B : masque plus doux et plus clair, pas d'anneau clair autour de l'œil, iris plus grand
b = base.replace(MASK, MASK.replace('#39201E', '#5A3A31')).replace(RIM, '')
b = b.replace('<ellipse rx="21" ry="24" fill="#70C3ED"/>', '<ellipse rx="23" ry="26" fill="#78C8F0"/>').replace('<ellipse cx="1" cy="3" rx="14" ry="17" fill="#123855"/>', '<ellipse cx="1" cy="4" rx="16" ry="19" fill="#163C5C"/>')
variant('B', b)
# C : chaton : masque en dégradé limité au museau, yeux plus bas et plus écartés, sur fourrure claire
c = b.replace(MASK, '<ellipse cx="177" cy="242" rx="86" ry="66" fill="url(#mask)"/>')
c = c.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg xmlns="http://www.w3.org/2000/svg"', 1).replace('<g id="ground-shadow">', GRAD + '<g id="ground-shadow">', 1)
c = c.replace('translate(146 211)', 'translate(140 219)').replace('translate(207 211)', 'translate(214 219)')
c = c.replace('<ellipse cx="177" cy="257" rx="28" ry="17" fill="#66403B"/>', '<ellipse cx="177" cy="259" rx="22" ry="14" fill="#4A2C26" opacity=".55"/>')
c = c.replace('<ellipse cx="124" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/><ellipse cx="230" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/>',
              '<ellipse cx="116" cy="252" rx="15" ry="9" fill="#F48FA0" opacity=".7"/><ellipse cx="238" cy="252" rx="15" ry="9" fill="#F48FA0" opacity=".7"/>')
variant('C', c)
# D : C + museau clair (bouche plus petite), contour de l'iris fin et sombre, reflet en étoile, oreilles intérieures plus roses
d = c.replace('<ellipse rx="23" ry="26" fill="#78C8F0"/>', '<ellipse rx="24.5" ry="27.5" fill="#2B1A17"/><ellipse rx="23" ry="26" fill="#78C8F0"/>')
d = d.replace('<circle cx="-6" cy="-9" r="8" fill="#FFFFFF"/>', '<ellipse cx="-6" cy="-10" rx="9" ry="8" fill="#FFFFFF"/>')
d = d.replace('<ellipse cx="177" cy="259" rx="22" ry="14" fill="#4A2C26" opacity=".55"/>', '<ellipse cx="177" cy="262" rx="20" ry="12" fill="#FFF2D9" opacity=".35"/>')
d = d.replace('fill="#F2A5AF"/></g>\n    <g id="ear-right">', 'fill="#F7B3BD"/></g>\n    <g id="ear-right">')
variant('D', d)
# E : chaton clair : masque taupe en dégradé seulement autour du museau, grands yeux posés sur la fourrure claire
GRAD2 = '''<defs><radialGradient id="mask2" cx="177" cy="250" r="78" gradientTransform="translate(0 50) scale(1 .8)" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#7E5848"/><stop offset=".42" stop-color="#9C7560" stop-opacity=".9"/><stop offset=".75" stop-color="#C9A486" stop-opacity=".45"/><stop offset="1" stop-color="#F4DBB4" stop-opacity="0"/></radialGradient></defs>'''
e = base.replace(MASK, '<ellipse cx="177" cy="246" rx="82" ry="58" fill="url(#mask2)"/>').replace(RIM, '').replace('<g id="ground-shadow">', GRAD2 + '<g id="ground-shadow">', 1)
e = e.replace('<ellipse rx="21" ry="24" fill="#70C3ED"/>', '<ellipse rx="27" ry="30" fill="#2B1A17"/><ellipse rx="25" ry="28" fill="#78C8F0"/>').replace('<ellipse cx="1" cy="3" rx="14" ry="17" fill="#123855"/>', '<ellipse cx="1" cy="4" rx="17.5" ry="20.5" fill="#163C5C"/>')
e = e.replace('<circle cx="-6" cy="-9" r="8" fill="#FFFFFF"/>', '<ellipse cx="-7" cy="-10" rx="9.5" ry="8.5" fill="#FFFFFF"/>').replace('<circle cx="8" cy="8" r="3.6" fill="#FFFFFF"/>', '<circle cx="9" cy="9" r="4.2" fill="#FFFFFF"/>')
e = e.replace('translate(146 211)', 'translate(138 216)').replace('translate(207 211)', 'translate(216 216)')
e = e.replace('<ellipse cx="177" cy="257" rx="28" ry="17" fill="#66403B"/>', '')
e = e.replace('<path d="M167 248 Q177 241 187 248 Q184 256 177 258 Q170 256 167 248Z" fill="#F2A5AF"/>', '<path d="M170 250 Q177 245 184 250 Q182 256 177 257 Q172 256 170 250Z" fill="#F28C9C"/>')
e = e.replace('<g id="mouth-smile" stroke="#F2A5AF"', '<g id="mouth-smile" stroke="#5E3A31"').replace('stroke-width="3.8"', 'stroke-width="3.2"')
e = e.replace('<ellipse cx="124" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/><ellipse cx="230" cy="246" rx="13" ry="7.5" fill="#F48FA0" opacity=".55"/>',
              '<ellipse cx="112" cy="252" rx="16" ry="9.5" fill="#F48FA0" opacity=".55"/><ellipse cx="242" cy="252" rx="16" ry="9.5" fill="#F48FA0" opacity=".55"/>')
e = e.replace('<g id="whiskers" stroke="#FFF2D9"', '<g id="whiskers" stroke="#C9A486"')
variant('E', e)
# F : E avec des yeux encore plus grands et une tête un peu plus ronde
f = e.replace('<ellipse rx="27" ry="30" fill="#2B1A17"/><ellipse rx="25" ry="28" fill="#78C8F0"/>', '<ellipse rx="29" ry="32" fill="#2B1A17"/><ellipse rx="27" ry="30" fill="#78C8F0"/>').replace('<ellipse cx="1" cy="4" rx="17.5" ry="20.5" fill="#163C5C"/>', '<ellipse cx="1" cy="4" rx="19" ry="22" fill="#163C5C"/>')
f = f.replace('translate(138 216)', 'translate(136 218)').replace('translate(216 216)', 'translate(218 218)').replace('<ellipse cx="176" cy="220" rx="85" ry="87" fill="#F4DBB4"/>', '<ellipse cx="177" cy="222" rx="90" ry="86" fill="#F4DBB4"/>')
variant('F', f)
