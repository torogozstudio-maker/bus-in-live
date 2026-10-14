import subprocess,sys,json
DB=sys.argv[1]
A,B,AD='aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003'
def run(sql,role=None,uid=None):
    pre=''
    if role: pre=f"SET ROLE {role}; SELECT set_config('request.jwt.claim.sub','{uid or ''}',false)\n;"
    r=subprocess.run(['su','postgres','-c',f"psql -At -q -X -d {DB} -v ON_ERROR_STOP=1"],input=pre+sql,capture_output=True,text=True)
    out=(r.stdout or '').strip().split('\n'); out=[l for l in out if l and not l.startswith(('SET','set_config')) and not l.startswith(('t','f')) or l in('t','f')] 
    return r.returncode==0, (r.stdout.strip(), r.stderr.strip())
def val(sql,role=None,uid=None):
    ok,(o,e)=run(sql,role,uid)
    if not ok: return None,e
    lines=[l for l in o.split('\n') if l]
    # descartar la línea del set_config (uuid o vacío) cuando hay prelude
    if role: lines=lines[1:] if lines and (lines[0]==(uid or '')) else lines
    return (lines[-1] if lines else ''),''
res=[];fails=0
def check(name,cond,detail=''):
    global fails
    res.append(('PASS' if cond else 'FAIL')+'  '+name+('' if cond else '   -> '+str(detail)[:150]))
    fails+= (not cond)
def count(sql,role,uid): v,e=val(f"select count(*) from ({sql}) q",role,uid); return (int(v) if v not in (None,'') else -1),e
def denied(sql,role,uid):
    ok,(o,e)=run(sql,role,uid); return (not ok) or o.strip()=='' or ('0' == o.strip().split('\n')[-1] and 'UPDATE 0' in o)
def rows(sql,role,uid):
    v,e=val(f"with x as ({sql} returning 1) select count(*) from x",role,uid); return (int(v) if v not in (None,'') else -1),e

# --- preparación (superusuario) ---
run(f"""TRUNCATE auth.users CASCADE;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('{A}','ana@test.com','{{"full_name":"Ana","role":"admin"}}'),('{B}','beto@test.com','{{}}'),('{AD}','admin@test.com','{{"name":"Admin"}}');
UPDATE profiles SET role='admin' WHERE id='{AD}';""")
v,e=val(f"select nombre||'|'||role from profiles where id='{A}'"); check('01 Trigger crea el perfil al registrarse (nombre desde metadatos, rol user aunque el metadato diga admin)', v=='Ana|user', (v,e))
v,e=val(f"select count(*) from profiles"); check('02 Se crearon los 3 perfiles', v=='3', (v,e))

n,e=count("select * from profiles",'authenticated',A); check('03 Usuario normal consulta profiles SIN recursión y ve solo el suyo', n==1, (n,e))
n,e=rows(f"update profiles set role='admin' where id='{A}'",'authenticated',A); check('04 Usuario NO puede ascenderse a admin', n==0 or (n==-1 and 'row-level security' in e), (n,e))
v,_=val(f"select role from profiles where id='{A}'"); check('04b …y su rol sigue siendo user', v=='user', v)
n,e=count("select * from profiles",'authenticated',AD); check('05 Admin ve todos los perfiles', n==3, (n,e))
n,e=rows(f"update profiles set role='admin' where id='{B}'",'authenticated',AD); check('06 Admin puede cambiar el rol de otro usuario', n==1, (n,e))
run(f"update profiles set role='user' where id='{B}'")
n,e=count("select * from profiles",'anon',None); check('07 Anónimo no ve perfiles', n==0, (n,e))

ok,(o,e)=run("insert into routes(code,name,origin,destination,validation_status,created_by) values ('R1','Ruta 1','A','B','pending','%s') returning id"%A,'authenticated',A)
check('08 Usuario crea ruta pendiente (con RETURNING, como hace la app)', ok and len(o)>20, e)
rid=[l for l in o.split('\n') if len(l)==36 and l!=A][-1] if ok else ''
ok,(o,e)=run("insert into routes(code,name,origin,destination,validation_status,created_by) values ('R2','x','A','B','approved','%s')"%A,'authenticated',A); check('09 Usuario NO puede crearse una ruta ya aprobada', not ok, o)
ok,(o,e)=run("insert into routes(code,name,origin,destination,validation_status,created_by) values ('R3','x','A','B','pending','%s')"%B,'authenticated',A); check('10 Usuario NO puede crear ruta a nombre de otro', not ok, o)
check('11a El creador ve su ruta pendiente', count("select * from routes",'authenticated',A)[0]==1)
check('11b Otro usuario NO la ve', count("select * from routes",'authenticated',B)[0]==0)
check('11c Anónimo NO la ve', count("select * from routes",'anon',None)[0]==0)
check('11d Admin la ve', count("select * from routes",'authenticated',AD)[0]==1)

ok,(o,e)=run(f"insert into route_variants(route_id,name) values ('{rid}','Directa') returning id",'authenticated',A); check('12 Creador agrega variante a su ruta pendiente', ok, e)
ok,(o,e)=run(f"insert into route_variants(route_id,name) values ('{rid}','Hack')",'authenticated',B); check('13 Otro usuario NO puede agregar variantes a esa ruta', not ok, o)
ok,(o,e)=run(f"insert into route_shapes(route_id,geometry) values ('{rid}','{{\"type\":\"LineString\",\"coordinates\":[[-89.55,13.99],[-89.56,14.0]]}}')",'authenticated',A); check('14 Creador agrega trazado (route_shapes)', ok, e)
run("insert into stops(name,latitude,longitude,created_by) values ('P1',13.9942,-89.5597,'%s')"%A)
ok,(o,e)=run(f"insert into route_stops(route_id,stop_id,sequence,direction) select '{rid}',id,1,'outbound' from stops limit 1",'authenticated',A); check('15 Creador agrega paradas a su ruta (route_stops)', ok, e)
check('16a Variante/trazado/paradas ocultos para otro usuario mientras está pendiente', sum(count(f"select * from {t}",'authenticated',B)[0] for t in ('route_variants','route_shapes','route_stops'))==0)
check('16b …y visibles para su creador', sum(count(f"select * from {t}",'authenticated',A)[0] for t in ('route_variants','route_shapes','route_stops'))==3)

n,e=rows(f"update routes set validation_status='approved' where id='{rid}'",'authenticated',A); check('17 Creador NO puede auto-aprobar su ruta', n==0 or (n==-1 and 'row-level security' in e), (n,e))
n,e=rows(f"update routes set validation_status='approved', status='normal' where id='{rid}'",'authenticated',AD); check('18 Admin aprueba la ruta', n==1, (n,e))
check('19a Tras aprobar: otro usuario ve ruta, variantes, trazados y paradas', count("select * from routes",'authenticated',B)[0]==1 and sum(count(f"select * from {t}",'authenticated',B)[0] for t in ('route_variants','route_shapes','route_stops'))==3)
check('19b Tras aprobar: anónimo ve la ruta', count("select * from routes",'anon',None)[0]==1)
n,e=rows(f"update routes set name='cambiada' where id='{rid}'",'authenticated',A); check('20 Creador ya no edita directamente una ruta aprobada', n==0 or (n==-1 and 'row-level security' in e), (n,e))

check('21 Anónimo lee paradas', count("select * from stops",'anon',None)[0]>=1)
n,e=rows("update stops set name='x'",'authenticated',B); check('22 Otro usuario no edita paradas ajenas', n==0, (n,e))

ok,(o,e)=run("insert into reports(user_id,type,description,status) values ('%s','traffic','Mucho tráfico','pending') returning id"%A,'authenticated',A); check('23 Usuario crea reporte', ok, e)
ok,(o,e)=run("insert into reports(user_id,type,description,status) values ('%s','traffic','x','confirmed')"%A,'authenticated',A); check('24 Usuario NO puede crear reporte ya confirmado', not ok, o)
check('25a Reporte pendiente: lo ve su autor', count("select * from reports",'authenticated',A)[0]==1)
check('25b …no lo ve otro usuario ni anónimo', count("select * from reports",'authenticated',B)[0]==0 and count("select * from reports",'anon',None)[0]==0)
n,e=count("select r.id,p.nombre from reports r join profiles p on p.id=r.user_id",'authenticated',AD); check('26 Admin ve reportes con el nombre del autor (join a profiles, como AdminReportes)', n==1, (n,e))
n,e=rows("update reports set status='confirmed', reviewed_by='%s', reviewed_at=now()"%AD,'authenticated',AD); check('27 Admin confirma el reporte', n==1, (n,e))
check('28 Reporte confirmado es público', count("select * from reports",'anon',None)[0]==1)

ok,(o,e)=run("insert into incidents(type,description,created_by,status) values ('traffic','Cierre','%s','active') returning id"%A,'authenticated',A); check('29 Usuario registra incidencia', ok, e)
check('30 Incidencia activa es pública', count("select * from incidents",'anon',None)[0]==1)
n,e=rows("update incidents set status='resolved', updated_at=now()",'authenticated',AD); check('31 Admin actualiza incidencia con updated_at (columna que la app escribe)', n==1, (n,e))

ok,(o,e)=run("insert into favorites(user_id,route_id) values ('%s','%s')"%(A,rid),'authenticated',A); check('32 Usuario guarda favorito', ok, e)
check('33 Favoritos son privados', count("select * from favorites",'authenticated',B)[0]==0)
ok,(o,e)=run("insert into favorites(user_id,route_id) values ('%s','%s')"%(B,rid),'authenticated',A); check('34 No puede guardar favoritos a nombre de otro', not ok, o)

ok,(o,e)=run("insert into trip_sessions(user_id,route_id,status) values ('%s','%s','active') returning id"%(A,rid),'authenticated',A); check('35 Usuario inicia viaje', ok, e)
tid=[l for l in o.split('\n') if len(l)==36 and l!=A][-1] if ok else ''
ok,(o,e)=run(f"insert into location_points(trip_session_id,latitude,longitude) values ('{tid}',13.99,-89.55)",'authenticated',A); check('36 Guarda puntos GPS de su viaje', ok, e)
ok,(o,e)=run(f"insert into location_points(trip_session_id,latitude,longitude) values ('{tid}',13.99,-89.55)",'authenticated',B); check('37 Otro usuario NO puede escribir en su viaje', not ok, o)
check('38 Viajes y GPS son privados', count("select * from trip_sessions",'authenticated',B)[0]==0 and count("select * from location_points",'authenticated',B)[0]==0)

ok,(o,e)=run("insert into route_change_requests(route_id,user_id,type,status) values ('%s','%s','edit','pending')"%(rid,A),'authenticated',A); check('39 Usuario pide cambio de ruta', ok, e)
check('40 Solicitud: la ve su autor y el admin, no otro usuario', count("select * from route_change_requests",'authenticated',A)[0]==1 and count("select * from route_change_requests",'authenticated',AD)[0]==1 and count("select * from route_change_requests",'authenticated',B)[0]==0)
n,e=rows("update route_change_requests set status='approved', reviewed_by='%s'"%AD,'authenticated',AD); check('41 Admin resuelve la solicitud', n==1, (n,e))

run("insert into stops(name,latitude,longitude,created_by) values ('Cerca',13.9945,-89.5597,'%s'),('Lejos',14.0122,-89.5597,'%s'),('Inactiva',13.9942,-89.5599,'%s')"%(A,A,A)); run("update stops set status='inactive' where name='Inactiva'")
ok,(o,e)=run("select name||'='||distance from get_nearby_stops(user_lat => 13.9942, user_lng => -89.5597, radius_meters => 500) order by distance",'authenticated',A)
names=[l for l in o.split('\n') if '=' in l]
check('42 get_nearby_stops con los nombres de parámetros de la app (500 m): solo paradas cercanas y activas', ok and [x.split('=')[0] for x in names]==['P1','Cerca'] , (o,e)); res.append('      resultado 500 m: '+', '.join(names))
ok,(o,e)=run("select name||'='||distance from get_nearby_stops(user_lat => 13.9942, user_lng => -89.5597, radius_meters => 3000)",'authenticated',A)
names=[l for l in o.split('\n') if '=' in l]
check('43 Con 3000 m incluye la parada lejana, ordenada por distancia y en METROS', ok and [x.split('=')[0] for x in names]==['P1','Cerca','Lejos'] and 1900<float(names[-1].split('=')[1])<2100, (o,e)); res.append('      resultado 3000 m: '+', '.join(names))
ok,(o,e)=run("select count(*) from get_nearby_stops(user_lat => 13.9942, user_lng => -89.5597)",'anon',None); check('44 Función usable sin sesión y con radio por defecto', ok, e)

run(f"update auth.users set last_sign_in_at='2026-10-10 12:00+00' where id='{A}'")
v,_=val(f"select last_sign_in_at is not null from profiles where id='{A}'"); check('45 last_sign_in_at se copia al perfil (AdminUsuarios)', v=='t', v)
ok,(o,e)=run("insert into routes(code,name,origin,destination) values ('X','x','a','b')",'anon',None); check('46 Anónimo no puede escribir', not ok, o)
ok,(o,e)=run("select count(*) from pg_policies p join pg_tables t on t.tablename=p.tablename and t.schemaname=p.schemaname where p.schemaname='public' and p.qual ilike '%from profiles%' and p.tablename<>'profiles'")
check('47 Ninguna política consulta profiles directamente (todas usan is_admin())', ok and o.strip()=='0', o)
ok,(o,e)=run("select string_agg(tablename,',') from (select tablename from pg_tables where schemaname='public' and rowsecurity and tablename not in (select tablename from pg_policies where schemaname='public')) q")
check('48 Toda tabla con RLS tiene al menos una política', ok and o.strip() in ('',), o)
print('\n'.join(res)); print(f"\n{DB}: {len(res)} líneas, {fails} FALLO(S)" if fails else f"\n{DB}: TODO OK")
